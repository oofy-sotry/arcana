const SKILLS = require('../data/skills')
const db = require('../../db/database')

class SkillSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }
}

module.exports = SkillSystem
