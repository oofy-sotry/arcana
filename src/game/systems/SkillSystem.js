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

  unlockForStage(pet) {
    Object.entries(SKILLS).forEach(([skillId, skill]) => {
      if (skill.attribute === pet.attribute && skill.unlockStage === pet.evolution_stage) {
        this.unlockSkill(pet, skillId)
      }
    })
  }

  upgradeSkill(pet, skillId) {
    const rows = db.query(
      'SELECT * FROM pet_skills WHERE pet_id = ? AND skill_id = ?',
      [pet.id, skillId]
    )
    if (rows.length === 0) return { ok: false, reason: 'not_unlocked' }

    const current = rows[0]
    if (current.skill_level >= 5) return { ok: false, reason: 'max_level' }
    if (pet.skill_points < 1)     return { ok: false, reason: 'no_points' }

    db.run(
      'UPDATE pet_skills SET skill_level = skill_level + 1 WHERE pet_id = ? AND skill_id = ?',
      [pet.id, skillId]
    )
    this.Pet.updatePet(pet.id, { skill_points: pet.skill_points - 1 })
    this.save()
    return { ok: true, newLevel: current.skill_level + 1 }
  }
}

module.exports = SkillSystem
