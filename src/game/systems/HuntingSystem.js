const { ZONES, MONSTERS } = require('../data/monsters')

const AUTO_ENERGY_COST   = 30
const MANUAL_ENERGY_COST = 15
const MANUAL_DROP_BONUS  = 0.20

class HuntingSystem {
  constructor({ Pet, save, combatSystem }) {
    this.Pet          = Pet
    this.save         = save
    this.combatSystem = combatSystem
    this._activeHunts = new Map() // petId → { zoneId, huntLogId }
  }
}

module.exports = HuntingSystem
