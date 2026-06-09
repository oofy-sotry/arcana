const CHARACTERS = require('../data/characters')
const db = require('../../db/database')

class EvolutionSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  canEvolve(pet) {
    const charData = Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === pet.evolution_stage
    )
    if (!charData || charData.nextId === null) return false

    return (
      pet.level    >= charData.evolveLevel &&
      pet.affinity >= charData.evolveAffinity
    )
  }
}

module.exports = EvolutionSystem
