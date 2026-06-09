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

  async init() {
    await db.init()
    db.runMigrations()

    this.petSystem = new PetSystem({ Pet, World, save: db.save })

    const pets = this.petSystem.getAll()
    if (pets.length > 0) {
      this.petSystem.applyOfflineProgress(pets)
    }

    db.save()
  }

  startTick() {
    this._tickTimer = setInterval(
      () => this.onTick(),
      TICK_INTERVAL_SECONDS * 1000
    )
  }

  onTick() {
    const pets = this.petSystem.getAll()
    if (pets.length === 0) return

    this.petSystem.tickConditions(pets)
    this.petSystem.tickAge(pets)

    World.set('last_save', String(Date.now()))
    db.save()
  }

  shutdown() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer)
      this._tickTimer = null
    }
    World.set('last_save', String(Date.now()))
    db.save()
  }
}

module.exports = GameWorld
