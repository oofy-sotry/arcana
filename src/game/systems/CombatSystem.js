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
}

module.exports = CombatSystem
