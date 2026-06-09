const { calcDamage } = require('../utils/formula')
const { getDropTable } = require('../data/monsters')

class CombatSystem {
  constructor({ Pet, save, levelSystem, itemSystem }) {
    this.Pet = Pet
    this.save = save
    this.levelSystem = levelSystem
    this.itemSystem  = itemSystem
  }
}

module.exports = CombatSystem
