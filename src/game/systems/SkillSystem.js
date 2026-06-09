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

  unlockSkill(pet, skillId) {
    const skill = SKILLS[skillId]
    if (!skill) return false
    if (pet.evolution_stage < skill.unlockStage) return false
    if (skill.attribute !== pet.attribute) return false

    db.run(
      `INSERT OR IGNORE INTO pet_skills (pet_id, skill_id, unlocked_at) VALUES (?, ?, ?)`,
      [pet.id, skillId, Date.now()]
    )
    this.save()
    return true
  }
}

module.exports = SkillSystem
