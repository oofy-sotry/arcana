class LevelSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  getExpRequired(level) {
    return Math.floor(Math.pow(level, 1.5) * 100)
  }
}

module.exports = LevelSystem
