class LevelSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  getExpRequired(level) {
    return Math.floor(Math.pow(level, 1.5) * 100)
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
