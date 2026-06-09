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
}

module.exports = CombatSystem
