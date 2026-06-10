const SKILLS = require('../data/skills')
const db = require('../../db/database')

// 스킬 레벨업 시 MP 비용 할인 (레벨당 -5%, 최대 25% 할인)
const MP_DISCOUNT_PER_LEVEL = 0.05

class SkillSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  // ─── 내부: unlockStage 조건 검사 ─────────────────────────────────
  // unlockStage: number (노말) | 'H2'/'H3' (히든) | 'O1' (옴니렉스)
  _stageUnlocked(pet, skill) {
    const us = skill.unlockStage
    if (typeof us === 'number') {
      return pet.evolution_stage >= us
    }
    if (typeof us === 'string') {
      if (us.startsWith('H')) {
        const req = Number(us.slice(1))
        return pet.is_hidden === 1 && pet.evolution_stage >= req
      }
      if (us.startsWith('O')) {
        return pet.attribute === 'omni' && pet.evolution_stage >= Number(us.slice(1))
      }
    }
    return false
  }

  // ─── 속성 일치 검사 ───────────────────────────────────────────────
  // 혼합속성 펫: attribute 또는 attribute2 일치하면 OK
  _attrMatches(pet, skill) {
    if (skill.attribute === pet.attribute) return true
    if (pet.attribute2 && skill.attribute === pet.attribute2) return true
    if (skill.attribute === 'omni' && pet.attribute === 'omni') return true
    return false
  }

  // ─── 펫의 모든 스킬(DB) 조회 ─────────────────────────────────────
  getPetSkills(petId) {
    const rows = db.query('SELECT * FROM pet_skills WHERE pet_id = ?', [petId])
    return rows.map(row => ({
      ...row,
      data: SKILLS[row.skill_id] || null,
    }))
  }

  // ─── 사용 가능한 액티브/버프 스킬 조회 ───────────────────────────
  getUnlockedActives(pet) {
    const rows = db.query(
      "SELECT * FROM pet_skills WHERE pet_id = ? AND skill_id IN (SELECT skill_id FROM pet_skills)",
      [pet.id]
    )
    return rows
      .map(r => ({ ...r, data: SKILLS[r.skill_id] }))
      .filter(r => r.data && (r.data.type === 'active' || r.data.type === 'buff'))
  }

  // ─── MP 비용 계산 (레벨업 시 할인) ──────────────────────────────
  getSkillMpCost(skillId, skillLevel = 1) {
    const skill = SKILLS[skillId]
    if (!skill) return 0
    const discount = Math.min((skillLevel - 1) * MP_DISCOUNT_PER_LEVEL, 0.25)
    return Math.max(1, Math.ceil(skill.mpCost * (1 - discount)))
  }

  // ─── 스킬 계수 (강화 적용) ────────────────────────────────────────
  getSkillCoefficient(skillId, skillLevel = 1) {
    const skill = SKILLS[skillId]
    if (!skill) return 1.0
    return skill.coefficient + (skillLevel - 1) * 0.1
  }

  // ─── 스킬 사용 가능 여부 (MP 체크) ──────────────────────────────
  canUseSkill(pet, skillId) {
    const rows = db.query(
      'SELECT skill_level FROM pet_skills WHERE pet_id = ? AND skill_id = ?',
      [pet.id, skillId]
    )
    if (!rows.length) return { ok: false, reason: 'not_unlocked' }
    const cost = this.getSkillMpCost(skillId, rows[0].skill_level)
    if ((pet.mp || 0) < cost) return { ok: false, reason: 'no_mp', cost }
    return { ok: true, cost, skillLevel: rows[0].skill_level }
  }

  // ─── MP 소비 (전투 중 스킬 사용 시 호출) ─────────────────────────
  consumeMp(petId, skillId, skillLevel = 1) {
    const cost = this.getSkillMpCost(skillId, skillLevel)
    const pet  = this.Pet.getPet(petId)
    if (!pet) return
    this.Pet.updatePet(petId, { mp: Math.max(0, (pet.mp || 0) - cost) })
  }

  // ─── 스킬 해금 ────────────────────────────────────────────────────
  unlockSkill(pet, skillId) {
    const skill = SKILLS[skillId]
    if (!skill) return false
    if (!this._stageUnlocked(pet, skill)) return false
    if (!this._attrMatches(pet, skill))   return false

    db.run(
      `INSERT OR IGNORE INTO pet_skills (pet_id, skill_id, unlocked_at) VALUES (?, ?, ?)`,
      [pet.id, skillId, Date.now()]
    )
    this.save()
    return true
  }

  // ─── 진화 단계 도달 시 자동 해금 ────────────────────────────────
  // EvolutionSystem.evolve() 이후 호출
  unlockForStage(pet) {
    Object.entries(SKILLS).forEach(([skillId, skill]) => {
      if (!this._attrMatches(pet, skill)) return

      // 이 단계에서 처음 해금되는 스킬만 등록
      const us = skill.unlockStage
      let isThisStage = false
      if (typeof us === 'number') {
        isThisStage = us === pet.evolution_stage
      } else if (typeof us === 'string' && us.startsWith('H')) {
        const req = Number(us.slice(1))
        isThisStage = pet.is_hidden === 1 && pet.evolution_stage === req
      } else if (typeof us === 'string' && us.startsWith('O')) {
        isThisStage = pet.attribute === 'omni' && pet.evolution_stage === Number(us.slice(1))
      }

      if (isThisStage) this.unlockSkill(pet, skillId)
    })
  }

  // ─── 스킬 강화 ────────────────────────────────────────────────────
  upgradeSkill(pet, skillId) {
    const rows = db.query(
      'SELECT * FROM pet_skills WHERE pet_id = ? AND skill_id = ?',
      [pet.id, skillId]
    )
    if (!rows.length)              return { ok: false, reason: 'not_unlocked' }
    if (rows[0].skill_level >= 5)  return { ok: false, reason: 'max_level' }
    if ((pet.skill_points || 0) < 1) return { ok: false, reason: 'no_points' }

    db.run(
      'UPDATE pet_skills SET skill_level = skill_level + 1 WHERE pet_id = ? AND skill_id = ?',
      [pet.id, skillId]
    )
    this.Pet.updatePet(pet.id, { skill_points: pet.skill_points - 1 })
    this.save()
    return { ok: true, newLevel: rows[0].skill_level + 1 }
  }
}

module.exports = SkillSystem
