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

    const HIDDEN_BONUS = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.30 }
    const bonus  = evoType === 'hidden' ? (HIDDEN_BONUS[toStage] || 0) : 0
    const nextChar = Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === toStage
    )

    const updates = {
      evolution_stage: toStage,
      hp:      Math.ceil(pet.hp      * (1 + bonus)),
      mp:      Math.ceil(pet.mp      * (1 + bonus)),
      attack:  Math.ceil(pet.attack  * (1 + bonus)),
      defense: Math.ceil(pet.defense * (1 + bonus)),
      speed:   Math.ceil(pet.speed   * (1 + bonus)),
    }
    if (nextChar) updates.name = nextChar.name

    this.Pet.updatePet(pet.id, updates)

    db.run(
      `INSERT INTO evolution_log (pet_id, from_stage, to_stage, evo_type, evolved_at)
       VALUES (?, ?, ?, ?, ?)`,
      [pet.id, fromStage, toStage, evoType, Date.now()]
    )

    this.save()
    return { fromStage, toStage, evoType }
  }

  checkHiddenConditions(pet) {
    const charData = Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === pet.evolution_stage
    )
    if (!charData?.hiddenConditions?.length) return false

    return charData.hiddenConditions.every(cond => {
      switch (cond.type) {
        case 'high_affinity':
          return (pet.affinity || 0) >= cond.value

        case 'battle_wins': {
          const row = db.query(
            "SELECT COALESCE(SUM(count), 0) AS total FROM daily_activity WHERE activity = 'hunt'"
          )[0]
          return Number(row?.total ?? 0) >= cond.value
        }

        case 'age_seconds':
          return (pet.age_seconds || 0) >= cond.value

        default:
          return false
      }
    })
  }
}

module.exports = EvolutionSystem
