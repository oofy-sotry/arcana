const { calcDamage }   = require('../utils/formula')
const { getDropTable } = require('../data/monsters')
const SKILLS           = require('../data/skills')

class CombatSystem {
  constructor({ Pet, save, levelSystem, itemSystem, equipmentSystem, summonerSystem, faintSystem, gymSystem }) {
    this.Pet             = Pet
    this.save            = save
    this.levelSystem     = levelSystem
    this.itemSystem      = itemSystem
    this.equipmentSystem = equipmentSystem || null
    this.summonerSystem  = summonerSystem || null
    this.faintSystem     = faintSystem || null
    this.gymSystem       = gymSystem || null
    this._battles        = new Map()
  }

  // ─── 장비 스탯 합산 (강화 보너스 + 세트 보너스) ───────────────────
  _getEquipmentStats(petId) {
    const db = require('../../db/database')
    const bonus = { attack: 0, defense: 0, hp: 0, speed: 0 }

    const rows = db.query(
      `SELECT ed.stats_json, ei.enhance_level
       FROM   pet_equipped_slots pes
       JOIN   equipment_inventory ei ON ei.id  = pes.inventory_id
       JOIN   equipment_defs      ed ON ed.id  = ei.def_id
       WHERE  pes.pet_id = ? AND pes.inventory_id IS NOT NULL`,
      [petId]
    )
    for (const { stats_json, enhance_level } of rows) {
      let stats = {}
      try { stats = JSON.parse(stats_json || '{}') } catch (_) {}
      const mult = 1 + (enhance_level || 0) * 0.08   // 강화 레벨당 8% 보너스
      for (const key of Object.keys(bonus)) {
        if (stats[key]) bonus[key] += Math.floor(stats[key] * mult)
      }
    }

    // 세트 보너스: 2피스마다 총 스탯에 10% 추가
    if (this.equipmentSystem) {
      const setBonuses = this.equipmentSystem.getSetBonuses(petId)
      const totalBoost = setBonuses.reduce((sum, b) => sum + b.statBoost, 0)
      if (totalBoost > 0) {
        for (const key of Object.keys(bonus)) {
          bonus[key] = Math.floor(bonus[key] * (1 + totalBoost))
        }
      }
    }

    return bonus
  }

  // ─── 속성 기준 패시브 스킬 목록 ────────────────────────────────────
  // 히든 트랙: unlockStage 'H2'/'H3' 는 pet.is_hidden && stage >= 숫자 조건
  _getPassiveEffects(pet) {
    const passives = []
    const attr  = pet.attribute
    const stage = pet.evolution_stage

    for (const skill of Object.values(SKILLS)) {
      if (skill.attribute !== attr || skill.type !== 'passive') continue

      const us = skill.unlockStage
      let unlocked = false
      if (typeof us === 'number') {
        unlocked = stage >= us
      } else if (typeof us === 'string' && us.startsWith('H')) {
        const req = Number(us.slice(1))
        unlocked = pet.is_hidden === 1 && stage >= req
      }
      if (unlocked && skill.effect) passives.push(skill.effect)
    }
    return passives
  }

  // ─── 전투용 스탯 (장비·소환사 스탯·패시브 반영) — 자동 전투와 턴제 전투가 같이 씀 ─────
  buildCombatant(pet) {
    const equip    = this._getEquipmentStats(pet.id)
    const passives = this._getPassiveEffects(pet)

    // 소환사 스탯: speed_bonus — 투자 포인트당 유효 속도 +1
    const speedBonus = this.summonerSystem?.getActiveStat('speed_bonus') || 0

    // 체육관 배지: 그 속성 배지 단계마다 공격·방어 +2%
    const badge = this.gymSystem?.getBadgeBonus(pet.attribute) ?? 1

    // 장비 적용 후 유효 스탯 (HP는 전투용 별도 추적)
    const effectivePet = {
      ...pet,
      attack:  Math.round((pet.attack  + equip.attack)  * badge),
      defense: Math.round((pet.defense + equip.defense) * badge),
      speed:   pet.speed   + equip.speed + speedBonus,
    }
    const maxHp = pet.hp + equip.hp

    // 소환사 스탯: debuff_bonus — 투자 포인트당 패시브 감소/독/반격 효과 +1%
    const debuffBonus = this.summonerSystem?.getActiveStat('debuff_bonus') || 0
    const debuffMult   = 1 + debuffBonus * 0.01

    // 패시브 도트(독성 신체 등) 상태: { value, duration }
    const dotPerTurn = passives
      .filter(p => p.type === 'dot' && p.duration >= 99)
      .reduce((sum, p) => sum + p.value, 0) * debuffMult

    return { effectivePet, maxHp, passives, debuffMult, dotPerTurn }
  }

  // ─── 전투 초기화 ───────────────────────────────────────────────────
  startBattle(pet, monster, mode = 'auto', synergyMult = 1.0) {
    const { effectivePet, maxHp: startHp, passives, debuffMult, dotPerTurn: monsterDot } = this.buildCombatant(pet)

    const state = {
      pet: effectivePet,
      monster: { ...monster, currentHp: monster.hp },
      petHp: startHp,
      petMaxHp: startHp,
      mode,
      synergyMult,
      passives,
      debuffMult,
      monsterDotPerTurn: monsterDot,  // 매 펫 턴마다 몬스터에 주는 패시브 독 피해
      log: [],
    }
    this._battles.set(pet.id, state)
    return state
  }

  // ─── 몬스터 공격 턴 ────────────────────────────────────────────────
  executeMonsterTurn(petId) {
    const state = this._battles.get(petId)
    if (!state) return null
    const { pet, monster, passives } = state

    // 패시브 회피 (wind_dodge: dodge 15%)
    const dodgeRate = passives
      .filter(p => p.type === 'dodge')
      .reduce((sum, p) => sum + p.value, 0)
    if (dodgeRate > 0 && Math.random() < dodgeRate) {
      const entry = { actor: 'monster', damage: 0, dodged: true }
      state.log.push(entry)
      return entry
    }

    const result = calcDamage({
      attack: monster.attack,
      defense: pet.defense,
      skillLevel: 1,
      attackerAttr: monster.attribute,
      defenderAttr: pet.attribute,
    })

    // 패시브 피해 감소 (water_shield / earth_armor / dragon_scale)
    const reduction = passives
      .filter(p => p.type === 'damage_reduction')
      .reduce((sum, p) => sum + p.value, 0) * (state.debuffMult || 1)
    const finalDamage = Math.max(1, result.damage - reduction)

    state.petHp -= finalDamage

    // 패시브 반격 (static_field / frost_skin)
    const counterDmg = passives
      .filter(p => p.type === 'counter')
      .reduce((sum, p) => sum + p.value, 0) * (state.debuffMult || 1)
    if (counterDmg > 0) {
      state.monster.currentHp -= counterDmg
    }

    const entry = { actor: 'monster', ...result, damage: finalDamage, reduction, counter: counterDmg }
    state.log.push(entry)
    return entry
  }

  // ─── 펫 공격 턴 ────────────────────────────────────────────────────
  executePetTurn(petId, skillLevel = 1) {
    const state = this._battles.get(petId)
    if (!state) return null
    const { pet, monster, passives } = state

    const result = calcDamage({
      attack: pet.attack,
      defense: monster.defense,
      skillLevel,
      attackerAttr: pet.attribute,
      defenderAttr: monster.attribute,
    })

    // 파티 시너지 배율 + 패시브 추가 피해 (fire_aura)
    const bonusDmg = passives
      .filter(p => p.type === 'bonus_damage')
      .reduce((sum, p) => sum + p.value, 0)
    // 소환사 스탯: battle_bonus — 투자 포인트당 데미지 +1%
    const battleBonus = this.summonerSystem?.getActiveStat('battle_bonus') || 0
    // 소환사 스탯: boss_bonus — 투자 포인트당 보스 상대 데미지 +1%
    const bossBonus = state.monster.isBoss ? (this.summonerSystem?.getActiveStat('boss_bonus') || 0) : 0
    const finalDamage = Math.ceil(
      result.damage * (state.synergyMult || 1.0) * (1 + battleBonus * 0.01) * (1 + bossBonus * 0.01)
    ) + bonusDmg

    state.monster.currentHp -= finalDamage

    // 패시브 지속 독 피해 (toxic_body)
    if (state.monsterDotPerTurn > 0) {
      state.monster.currentHp -= state.monsterDotPerTurn
    }

    const entry = { actor: 'pet', ...result, damage: finalDamage, bonusDmg }
    state.log.push(entry)
    return entry
  }

  // ─── 전투 종료 체크 ────────────────────────────────────────────────
  checkBattleEnd(petId) {
    const state = this._battles.get(petId)
    if (!state) return 'ongoing'
    if (state.monster.currentHp <= 0) return 'won'
    if (state.petHp <= 0)            return 'lost'
    return 'ongoing'
  }

  // ─── 승리 보상 (경험치·코인·드롭) — 자동 전투와 턴제 전투가 같이 씀 ─────────────
  grantVictory(pet, monster, { dropRateBonus = 0, huntLogId = null } = {}) {
    const db    = require('../../db/database')
    const petId = pet.id
    const drops = []
    this.levelSystem.addExperience(pet, monster.exp)
    const coinAmt = monster.coins.min + Math.floor(Math.random() * (monster.coins.max - monster.coins.min + 1))
    this.Pet.updatePet(petId, { coins: (pet.coins || 0) + coinAmt })

    const table = getDropTable(monster.id)
    for (const entry of table) {
      const roll      = Math.random()
      const effective = Math.min(entry.rate + dropRateBonus, 1.0)
      if (roll < effective) {
        this.itemSystem.addItem(petId, entry.itemId, entry.quantity)
        drops.push({ itemId: entry.itemId, quantity: entry.quantity })
      }
    }

    const now = Date.now()
    db.run(
      `INSERT INTO drop_log (pet_id, hunt_log_id, coins, dropped_at) VALUES (?,?,?,?)`,
      [petId, huntLogId, coinAmt, now]
    )
    for (const d of drops) {
      db.run(
        `INSERT INTO drop_log (pet_id, hunt_log_id, item_id, quantity, dropped_at) VALUES (?,?,?,?,?)`,
        [petId, huntLogId, d.itemId, d.quantity, now]
      )
    }
    this.save()
    return { drops, coins: coinAmt }
  }

  // ─── 전투 결산 ─────────────────────────────────────────────────────
  endBattle(petId, { dropRateBonus = 0, huntLogId = null } = {}) {
    const state = this._battles.get(petId)
    if (!state) return null
    const { pet, monster, log } = state
    const result = this.checkBattleEnd(petId)
    const drops = []

    if (result === 'won') drops.push(...this.grantVictory(pet, monster, { dropRateBonus, huntLogId }).drops)
    // 패배 시 pets.hp는 건드리지 않는다 — 현재 HP가 아니라 최대 HP 스탯(전투마다 startBattle이
    // pet.hp로 새로 시작)이라 덮으면 스탯이 영구 손상됨. 대신 기절 처리(3번 넘으면 죽음)
    const faint = result === 'lost' ? this.faintSystem?.recordLoss(petId) ?? null : null

    this._battles.delete(petId)
    // 최대 HP는 렌더러가 턴 로그를 재생하며 HP 바를 깎는 연출에 사용
    return { result, drops, log, faint, petMaxHp: state.petMaxHp, monsterMaxHp: monster.hp }
  }

  // ─── 자동 전투 시뮬레이션 ─────────────────────────────────────────
  runAutoFight(pet, monster, opts = {}) {
    this.startBattle(pet, monster, opts.mode || 'auto', opts.synergyMult || 1.0)
    const petId = pet.id
    let turns = 0
    while (this.checkBattleEnd(petId) === 'ongoing' && turns < 100) {
      const state    = this._battles.get(petId)
      const petFirst = (state.pet.speed || 10) >= (state.monster.speed || 10)
      if (petFirst) {
        this.executePetTurn(petId)
        if (this.checkBattleEnd(petId) !== 'ongoing') break
        this.executeMonsterTurn(petId)
      } else {
        this.executeMonsterTurn(petId)
        if (this.checkBattleEnd(petId) !== 'ongoing') break
        this.executePetTurn(petId)
      }
      turns++
    }
    return this.endBattle(petId, opts)
  }
}

module.exports = CombatSystem
