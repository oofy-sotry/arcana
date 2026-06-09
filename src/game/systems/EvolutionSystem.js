const CHARACTERS = require('../data/characters')
const db = require('../../db/database')

class EvolutionSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }
}

module.exports = EvolutionSystem
