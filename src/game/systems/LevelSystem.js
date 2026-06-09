class LevelSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  getExpRequired(level) {
    return Math.floor(Math.pow(level, 1.5) * 100)
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
      level = this.levelUp(pet, level)
    }

    this.Pet.updatePet(pet.id, { level, exp })
    this.save()
    return { level, exp }
  }
}

module.exports = LevelSystem
