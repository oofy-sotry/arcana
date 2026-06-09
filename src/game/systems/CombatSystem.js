const { calcDamage } = require('../utils/formula')
const { getDropTable } = require('../data/monsters')

class CombatSystem {
  constructor({ Pet, save, levelSystem, itemSystem }) {
    this.Pet = Pet
    this.save = save
    this.levelSystem = levelSystem
    this.itemSystem  = itemSystem
    this._battles = new Map() // petId → battleState
  }

  // 전투 상태 초기화 — monster는 monsters.js의 MONSTERS 항목 + currentHp
  startBattle(pet, monster, mode = 'auto') {
    const state = {
      pet,
      monster: { ...monster, currentHp: monster.hp },
      petHp: pet.hp,
      mode,
      log: [],
    }
    this._battles.set(pet.id, state)
    return state
  }

  // 몬스터 공격 턴: 몬스터는 스킬 없이 기본 공격만 사용
  executeMonsterTurn(petId) {
    const state = this._battles.get(petId)
    if (!state) return null
    const { pet, monster } = state
    const result = calcDamage({
      attack: monster.attack,
      defense: pet.defense,
      skillLevel: 1,
      attackerAttr: monster.attribute,
      defenderAttr: pet.attribute,
    })
    state.petHp -= result.damage
    const entry = { actor: 'monster', ...result }
    state.log.push(entry)
    return entry
  }

  // 펫 공격 턴: 스킬 미지정 시 기본 공격(skillLevel=1) 사용
  executePetTurn(petId, skillLevel = 1) {
    const state = this._battles.get(petId)
    if (!state) return null
    const { pet, monster } = state
    const result = calcDamage({
      attack: pet.attack,
      defense: monster.defense,
      skillLevel,
      attackerAttr: pet.attribute,
      defenderAttr: monster.attribute,
    })
    state.monster.currentHp -= result.damage
    const entry = { actor: 'pet', ...result }
    state.log.push(entry)
    return entry
  }

  // 'ongoing' | 'won' | 'lost' 반환
  checkBattleEnd(petId) {
    const state = this._battles.get(petId)
    if (!state) return 'ongoing'
    if (state.monster.currentHp <= 0) return 'won'
    if (state.petHp <= 0)            return 'lost'
    return 'ongoing'
  }

  // 승리: exp/코인/드롭 지급 + drop_log 기록
  // 패배: 자동 모드 사망(영구) / 수동 모드는 HP 1로 생존 처리
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
        const roll = Math.random()
        const effective = Math.min(entry.rate + dropRateBonus, 1.0)
        if (roll < effective) {
          this.itemSystem.addItem(petId, entry.itemId, entry.quantity)
          drops.push({ itemId: entry.itemId, quantity: entry.quantity })
        }
      }

      db.run(
        `INSERT INTO drop_log (pet_id, hunt_log_id, item_id, quantity, coins, dropped_at) VALUES (?,?,?,?,?,?)`,
        [petId, huntLogId, drops.map(d => d.itemId).join(',') || null, drops.reduce((s, d) => s + d.quantity, 0), coinAmt, Date.now()]
      )
      this.save()
    } else if (result === 'lost') {
      if (mode === 'auto') {
        db.run(`DELETE FROM pets WHERE id = ?`, [petId])
        this.save()
      } else {
        this.Pet.updatePet(petId, { hp: 1 })
        this.save()
      }
    }

    this._battles.delete(petId)
    return { result, drops, log }
  }

  // 자동 사냥용: 한 번의 전투를 완전히 시뮬레이션
  runAutoFight(pet, monster, opts = {}) {
    this.startBattle(pet, monster, opts.mode || 'auto')
    const petId = pet.id
    let turns = 0
    while (this.checkBattleEnd(petId) === 'ongoing' && turns < 100) {
      this.executePetTurn(petId)
      if (this.checkBattleEnd(petId) !== 'ongoing') break
      this.executeMonsterTurn(petId)
      turns++
    }
    return this.endBattle(petId, opts)
  }
}

module.exports = CombatSystem
