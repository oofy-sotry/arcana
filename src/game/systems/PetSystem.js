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

  tickConditions(pets) {
    const now = Date.now()
    for (const pet of pets) {
      const cond = this.Pet.getConditions(pet.id)
      if (!cond) continue
      this.Pet.updateConditions(pet.id, {
        hunger:      Math.max(0, cond.hunger      - CONDITION_DECAY.hunger),
        happiness:   Math.max(0, cond.happiness   - CONDITION_DECAY.happiness),
        cleanliness: Math.max(0, cond.cleanliness - CONDITION_DECAY.cleanliness),
        last_updated: now,
      })
    }
  }

  tickAge(pets) {
    const now = Date.now()
    for (const pet of pets) {
      this.Pet.updatePet(pet.id, {
        age_seconds: pet.age_seconds + TICK_INTERVAL_SECONDS,
        last_active: now,
      })
    }
  }
}

module.exports = PetSystem
