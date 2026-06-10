class LevelSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  getExpRequired(level) {
    return Math.floor(Math.pow(level, 1.5) * 100)
  }

  // 성장 등급은 태어날 때 결정: 하(60%) 중(30%) 상(10%)
  // 현재 구현에서는 pet.growth_grade 컬럼 없이 id 해시로 결정 (재현 가능)
  calcStatGrowth(pet) {
    const hash       = pet.id % 10
    const multiplier = hash < 6 ? 1.0 : hash < 9 ? 1.5 : 2.0
    return {
      hp:      Math.ceil(5 * multiplier),
      mp:      Math.ceil(3 * multiplier),
      attack:  Math.ceil(2 * multiplier),
      defense: Math.ceil(1 * multiplier),
      speed:   Math.ceil(2 * multiplier),
    }
  }

  levelUp(pet, currentLevel) {
    const newLevel = currentLevel + 1
    const growth   = this.calcStatGrowth(pet)

    this.Pet.updatePet(pet.id, {
      hp:           pet.hp      + growth.hp,
      mp:           pet.mp      + growth.mp,
      attack:       pet.attack  + growth.attack,
      defense:      pet.defense + growth.defense,
      speed:        pet.speed   + growth.speed,
      skill_points: pet.skill_points + 1,
    })

    return newLevel
  }

  addExperience(pet, amount) {
    let { level, exp } = pet
    exp += amount

    while (exp >= this.getExpRequired(level)) {
      exp -= this.getExpRequired(level)
      const freshPet = this.Pet.getPet(pet.id) || pet
      level = this.levelUp(freshPet, level)
    }

    this.Pet.updatePet(pet.id, { level, exp })
    this.save()
    return { level, exp }
  }
}

module.exports = LevelSystem
