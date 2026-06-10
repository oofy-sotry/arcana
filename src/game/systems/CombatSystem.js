const { calcDamage }   = require('../utils/formula')
const { getDropTable } = require('../data/monsters')
const SKILLS           = require('../data/skills')

class CombatSystem {
  constructor({ Pet, save, levelSystem, itemSystem }) {
    this.Pet = Pet
    this.save = save
    this.levelSystem = levelSystem
    this.itemSystem  = itemSystem
    this._battles = new Map()
  }

  // ─── 장비 스탯 합산 ────────────────────────────────────────────────
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

  // ─── 전투 초기화 ───────────────────────────────────────────────────
  startBattle(pet, monster, mode = 'auto', synergyMult = 1.0) {
    const equip    = this._getEquipmentStats(pet.id)
    const passives = this._getPassiveEffects(pet)

    // 장비 적용 후 유효 스탯 (HP는 전투용 별도 추적)
    const effectivePet = {
      ...pet,
      attack:  pet.attack  + equip.attack,
      defense: pet.defense + equip.defense,
      speed:   pet.speed   + equip.speed,
    }
    const startHp = pet.hp + equip.hp

    // 패시브 도트(독성 신체 등) 상태: { value, duration }
    const monsterDot = passives
      .filter(p => p.type === 'dot' && p.duration >= 99)
      .reduce((sum, p) => sum + p.value, 0)

    const state = {
      pet: effectivePet,
      monster: { ...monster, currentHp: monster.hp },
      petHp: startHp,
      mode,
      synergyMult,
      passives,
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
      .reduce((sum, p) => sum + p.value, 0)
    const finalDamage = Math.max(1, result.damage - reduction)

    state.petHp -= finalDamage

    // 패시브 반격 (static_field / frost_skin)
    const counterDmg = passives
      .filter(p => p.type === 'counter')
      .reduce((sum, p) => sum + p.value, 0)
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
    const finalDamage = Math.ceil(result.damage * (state.synergyMult || 1.0)) + bonusDmg

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

  // ─── 전투 결산 ─────────────────────────────────────────────────────
  endBattle(petId, { dropRateBonus = 0, huntLogId = null } = {}) {
    const db = require('../../db/database')
    const state = this._battles.get(petId)
    if (!state) return null
    const { pet, monster, mode, log } = state
    const result = this.checkBattleEnd(petId)
    const drops = []

    if (result === 'won') {
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

    } else if (result === 'lost') {
      if (mode === 'auto') {
        const shieldKey = `death_shield_${petId}`
        const reviveKey = `auto_revive_${petId}`
        const shield    = db.query('SELECT value FROM world_state WHERE key = ?', [shieldKey])[0]
        const revive    = db.query('SELECT value FROM world_state WHERE key = ?', [reviveKey])[0]

        if (shield) {
          db.run('DELETE FROM world_state WHERE key = ?', [shieldKey])
          this.Pet.updatePet(petId, { hp: 1 })
        } else if (revive) {
          db.run('DELETE FROM world_state WHERE key = ?', [reviveKey])
          const deadPet  = this.Pet.getPet(petId)
          const reviveHp = Math.max(1, Math.ceil((deadPet?.hp || 100) * 0.5))
          this.Pet.updatePet(petId, { hp: reviveHp })
        } else {
          this.Pet.updatePet(petId, { is_alive: 0 })
        }
      } else {
        this.Pet.updatePet(petId, { hp: 1 })
      }
      this.save()
    }

    this._battles.delete(petId)
    return { result, drops, log }
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
