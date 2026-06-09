const { getElapsedSeconds, calcOfflineTicks, TICK_INTERVAL_SECONDS } = require('../utils/time')

// GDD 기준: -1.5%/h → tick(60s)당 감소량
const CONDITION_DECAY = {
  hunger:      0.025,
  happiness:   0.025,
  cleanliness: 0.015,
}

class PetSystem {
  // Pet, World: db 모델 주입 (game/이 Electron에 직접 의존하지 않도록)
  // save: db.save 함수 주입
  constructor({ Pet, World, save }) {
    this.Pet  = Pet
    this.World = World
    this.save = save
  }

  createPet(name, attribute, species = 'default') {
    const pet = this.Pet.createPet(name, attribute, species)
    this.save()
    return pet
  }

  getAll() {
    return this.Pet.getAllPets().map(pet => ({
      ...pet,
      conditions: this.Pet.getConditions(pet.id),
    }))
  }
}

module.exports = PetSystem
