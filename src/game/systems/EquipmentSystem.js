const db = require('../../db/database')

// 강화 성공률: +1~+5 90%, +6~+8 60%, +9~+10 30%
const ENHANCE_RATES = { 1:0.90, 2:0.90, 3:0.90, 4:0.90, 5:0.90, 6:0.60, 7:0.60, 8:0.60, 9:0.30, 10:0.30 }

// 강화에 필요한 재료
const ENHANCE_MATERIALS = {
  1:  { itemId: 'enhance_stone',   qty: 1 },
  2:  { itemId: 'enhance_stone',   qty: 2 },
  3:  { itemId: 'enhance_stone',   qty: 3 },
  4:  { itemId: 'enhance_stone',   qty: 5 },
  5:  { itemId: 'enhance_stone',   qty: 8 },
  6:  { itemId: 'enhance_crystal', qty: 1 },
  7:  { itemId: 'enhance_crystal', qty: 2 },
  8:  { itemId: 'enhance_crystal', qty: 3 },
  9:  { itemId: 'enhance_jewel',   qty: 1 },
  10: { itemId: 'enhance_jewel',   qty: 2 },
}

// 장비 등급별 기본 스탯 범위 (정의만; 실제 값은 equipment_defs.stats_json)
// 참고용: normal < rare < epic < legendary
const GRADE_STAT_MULT = { normal: 1.0, rare: 1.5, epic: 2.2, legendary: 3.5 }

// 장비 상자 열 때 등급 확률
const BOX_GRADE_RATES = {
  normal:    { normal: 0.70, rare: 0.25, epic: 0.05, legendary: 0.00 },
  rare:      { normal: 0.20, rare: 0.55, epic: 0.23, legendary: 0.02 },
  epic:      { normal: 0.00, rare: 0.25, epic: 0.60, legendary: 0.15 },
  legendary: { normal: 0.00, rare: 0.05, epic: 0.40, legendary: 0.55 },
}

// 장비 상자 열 때 슬롯 확률 (weapon 40%, armor 40%, accessory 20%)
const BOX_SLOT_RATES = { weapon: 0.40, armor: 0.40, accessory: 0.20 }

class EquipmentSystem {
  constructor({ save, itemSystem }) {
    this.save        = save
    this.itemSystem  = itemSystem
  }

  // ─── 인벤토리 조회 ─────────────────────────────────────────────────
  getInventory(petId) {
    return db.query(
      `SELECT ei.id, ei.def_id, ei.enhance_level, ei.is_equipped, ei.obtained_at,
              ed.name, ed.slot, ed.grade, ed.attribute, ed.set_id, ed.stats_json
       FROM   equipment_inventory ei
       JOIN   equipment_defs ed ON ed.id = ei.def_id
       WHERE  ei.pet_id = ?
       ORDER  BY ei.obtained_at DESC`,
      [petId]
    ).map(row => ({ ...row, stats: this._parseStats(row.stats_json, row.enhance_level) }))
  }

  // ─── 현재 착용 슬롯 조회 ───────────────────────────────────────────
  getEquipped(petId) {
    return db.query(
      `SELECT pes.slot, ei.id AS inventory_id, ei.enhance_level,
              ed.name, ed.grade, ed.attribute, ed.set_id, ed.stats_json
       FROM   pet_equipped_slots pes
       LEFT   JOIN equipment_inventory ei ON ei.id  = pes.inventory_id
       LEFT   JOIN equipment_defs      ed ON ed.id  = ei.def_id
       WHERE  pes.pet_id = ?`,
      [petId]
    ).map(row => ({ ...row, stats: row.stats_json ? this._parseStats(row.stats_json, row.enhance_level) : null }))
  }

  // ─── 착용 ─────────────────────────────────────────────────────────
  equip(petId, inventoryId) {
    const item = db.query(
      `SELECT ei.*, ed.slot FROM equipment_inventory ei JOIN equipment_defs ed ON ed.id = ei.def_id
       WHERE ei.id = ? AND ei.pet_id = ?`,
      [inventoryId, petId]
    )[0]
    if (!item) return { ok: false, error: '보유하지 않은 장비입니다' }

    // 슬롯 초기화 보장
    db.run(
      `INSERT OR IGNORE INTO pet_equipped_slots (pet_id, slot, inventory_id) VALUES (?, ?, NULL)`,
      [petId, item.slot]
    )
    // 기존 착용 아이템 해제
    const prev = db.query(
      'SELECT inventory_id FROM pet_equipped_slots WHERE pet_id = ? AND slot = ?',
      [petId, item.slot]
    )[0]
    if (prev?.inventory_id) {
      db.run('UPDATE equipment_inventory SET is_equipped = 0 WHERE id = ?', [prev.inventory_id])
    }
    // 새 장비 착용
    db.run(
      'UPDATE pet_equipped_slots SET inventory_id = ? WHERE pet_id = ? AND slot = ?',
      [inventoryId, petId, item.slot]
    )
    db.run('UPDATE equipment_inventory SET is_equipped = 1 WHERE id = ?', [inventoryId])
    this.save()
    return { ok: true, slot: item.slot }
  }

  // ─── 해제 ─────────────────────────────────────────────────────────
  unequip(petId, slot) {
    const row = db.query(
      'SELECT inventory_id FROM pet_equipped_slots WHERE pet_id = ? AND slot = ?',
      [petId, slot]
    )[0]
    if (!row?.inventory_id) return { ok: false, error: '해당 슬롯에 장비가 없습니다' }

    db.run('UPDATE equipment_inventory SET is_equipped = 0 WHERE id = ?', [row.inventory_id])
    db.run('UPDATE pet_equipped_slots SET inventory_id = NULL WHERE pet_id = ? AND slot = ?', [petId, slot])
    this.save()
    return { ok: true }
  }

  // ─── 강화 ─────────────────────────────────────────────────────────
  enhance(petId, inventoryId) {
    const item = db.query(
      'SELECT ei.*, ed.grade FROM equipment_inventory ei JOIN equipment_defs ed ON ed.id = ei.def_id WHERE ei.id = ? AND ei.pet_id = ?',
      [inventoryId, petId]
    )[0]
    if (!item) return { ok: false, error: '보유하지 않은 장비입니다' }
    if (item.enhance_level >= 10) return { ok: false, error: '이미 최대 강화 단계입니다' }

    const nextLevel = item.enhance_level + 1
    const mat       = ENHANCE_MATERIALS[nextLevel]
    const hasItem   = this.itemSystem.getItemCount(petId, mat.itemId)
    if (hasItem < mat.qty) {
      return { ok: false, error: `${mat.itemId} ${mat.qty}개 필요 (보유: ${hasItem})` }
    }

    // 재료 소비
    this.itemSystem.removeItem(petId, mat.itemId, mat.qty)

    const success = Math.random() < (ENHANCE_RATES[nextLevel] || 0)
    const now     = Date.now()

    if (success) {
      db.run('UPDATE equipment_inventory SET enhance_level = ? WHERE id = ?', [nextLevel, inventoryId])
    }
    db.run(
      `INSERT INTO equipment_enhance_log (inventory_id, from_level, to_level, success, enhanced_at)
       VALUES (?, ?, ?, ?, ?)`,
      [inventoryId, item.enhance_level, success ? nextLevel : item.enhance_level, success ? 1 : 0, now]
    )
    this.save()
    return { ok: true, success, fromLevel: item.enhance_level, toLevel: success ? nextLevel : item.enhance_level, rate: ENHANCE_RATES[nextLevel] }
  }

  // ─── 장비 상자 열기 ───────────────────────────────────────────────
  openBox(petId, itemId) {
    const boxGradeMap = {
      equip_box_normal: 'normal', equip_box_rare: 'rare',
      equip_box_epic: 'epic', equip_box_legendary: 'legendary',
    }
    const boxGrade = boxGradeMap[itemId]
    if (!boxGrade) return { ok: false, error: '장비 상자 아이템이 아닙니다' }

    const hasBox = this.itemSystem.getItemCount(petId, itemId)
    if (hasBox < 1) return { ok: false, error: '장비 상자가 없습니다' }

    // 등급 결정
    const gradeRates = BOX_GRADE_RATES[boxGrade]
    const grade      = this._rollTable(gradeRates)

    // 슬롯 결정
    const slot = this._rollTable(BOX_SLOT_RATES)

    // 해당 등급+슬롯 장비 정의에서 랜덤 선택
    const defs = db.query(
      'SELECT * FROM equipment_defs WHERE grade = ? AND slot = ?',
      [grade, slot]
    )
    if (!defs.length) return { ok: false, error: '해당 등급·슬롯 장비 정의가 없습니다' }

    const def = defs[Math.floor(Math.random() * defs.length)]

    // 인벤토리에 추가
    this.itemSystem.removeItem(petId, itemId, 1)
    db.run(
      `INSERT INTO equipment_inventory (pet_id, def_id, enhance_level, is_equipped, obtained_at)
       VALUES (?, ?, 0, 0, ?)`,
      [petId, def.id, Date.now()]
    )
    const newId = db.query('SELECT last_insert_rowid() AS id')[0].id
    this.save()

    return {
      ok: true,
      equipment: {
        id:    newId,
        defId: def.id,
        name:  def.name,
        slot:  def.slot,
        grade: def.grade,
        stats: this._parseStats(def.stats_json, 0),
      },
    }
  }

  // ─── 세트 효과 계산 ───────────────────────────────────────────────
  getSetBonuses(petId) {
    const equipped = this.getEquipped(petId)
    const setCount = {}
    for (const item of equipped) {
      if (item.set_id) setCount[item.set_id] = (setCount[item.set_id] || 0) + 1
    }
    // 2개 이상 동일 세트 착용 시 보너스 (현재는 스탯 10% 추가)
    const bonuses = []
    for (const [setId, cnt] of Object.entries(setCount)) {
      if (cnt >= 2) bonuses.push({ setId, pieces: cnt, statBoost: 0.10 * Math.floor(cnt / 2) })
    }
    return bonuses
  }

  // ─── 헬퍼 ─────────────────────────────────────────────────────────
  _parseStats(statsJson, enhanceLevel = 0) {
    let base = {}
    try { base = JSON.parse(statsJson || '{}') } catch (_) {}
    const mult = 1 + (enhanceLevel || 0) * 0.08
    const result = {}
    for (const [k, v] of Object.entries(base)) result[k] = Math.floor(v * mult)
    return result
  }

  _rollTable(rateTable) {
    let roll = Math.random()
    for (const [key, rate] of Object.entries(rateTable)) {
      roll -= rate
      if (roll <= 0) return key
    }
    return Object.keys(rateTable)[Object.keys(rateTable).length - 1]
  }
}

module.exports = EquipmentSystem
