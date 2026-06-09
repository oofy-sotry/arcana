const db        = require('../db/database')
const Pet        = require('../db/models/Pet')
const World      = require('../db/models/World')
const PetSystem  = require('../game/systems/PetSystem')
const { TICK_INTERVAL_SECONDS } = require('../game/utils/time')

class GameWorld {
  constructor() {
    this.petSystem  = null
    this._tickTimer = null
  }
}

module.exports = GameWorld
