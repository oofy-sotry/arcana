const SKILLS = require('../data/skills')
const db = require('../../db/database')

class SkillSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  getPetSkills(petId) {
    const rows = db.query(
      'SELECT * FROM pet_skills WHERE pet_id = ?',
      [petId]
    )
    return rows.map(row => ({
      ...row,
      data: SKILLS[row.skill_id] || null,
    }))
  }
}

module.exports = SkillSystem
