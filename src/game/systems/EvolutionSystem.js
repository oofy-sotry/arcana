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

  evolve(pet, evoType = 'normal') {
    const fromStage = pet.evolution_stage
    const toStage   = fromStage + 1

    // 히든 진화 스탯 보너스 (GDD 기준)
    const HIDDEN_BONUS = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.30 }
    const bonus = evoType === 'hidden' ? (HIDDEN_BONUS[toStage] || 0) : 0

    this.Pet.updatePet(pet.id, {
      evolution_stage: toStage,
      hp:      Math.ceil(pet.hp      * (1 + bonus)),
      mp:      Math.ceil(pet.mp      * (1 + bonus)),
      attack:  Math.ceil(pet.attack  * (1 + bonus)),
      defense: Math.ceil(pet.defense * (1 + bonus)),
      speed:   Math.ceil(pet.speed   * (1 + bonus)),
    })

    db.run(
      `INSERT INTO evolution_log (pet_id, from_stage, to_stage, evo_type, evolved_at)
       VALUES (?, ?, ?, ?, ?)`,
      [pet.id, fromStage, toStage, evoType, Date.now()]
    )

    this.save()
    return { fromStage, toStage, evoType }
  }

  // 히든 진화 조건 체크 — Phase 3+ 에서 각 조건 유형(A~J) 순차 구현
  // 현재는 구조만 정의, 기본값 false 반환
  checkHiddenConditions(pet) {
    const charData = Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === pet.evolution_stage
    )
    if (!charData || !charData.hiddenConditions) return false
    return false
  }
}

module.exports = EvolutionSystem
