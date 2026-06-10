const CHARACTERS = require('../data/characters')
const db = require('../../db/database')

// 히든 진화마다 해당 단계의 보너스가 누적 적용됨
// 빠르게 히든이 될수록 더 많은 보너스를 받는 이유
const HIDDEN_BONUS = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.30 }

class EvolutionSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  // ─── 현재 스테이지에 맞는 캐릭터 데이터 반환 ─────────────────────────
  // 우선순위: omni > hybrid(attribute2) > hidden > normal
  _findCharData(pet) {
    const stage = pet.evolution_stage

    if (pet.attribute === 'omni') {
      return Object.values(CHARACTERS).find(c => c.attribute === 'omni' && c.stage === stage)
    }
    if (pet.attribute2) {
      if (pet.is_hidden) {
        return Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === stage && c.isHidden
        ) || Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.stage === stage && c.isHidden
        )
      }
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === stage && !c.isHidden
      )
    }
    if (pet.is_hidden) {
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.stage === stage && c.isHidden
      )
    }
    return Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === stage && !c.isHidden
    )
  }

  // ─── 다음 스테이지 캐릭터 반환 ────────────────────────────────────────
  _findNextChar(pet, isHiddenEvo) {
    const toStage = pet.evolution_stage + 1

    if (pet.attribute === 'omni') {
      return Object.values(CHARACTERS).find(c => c.attribute === 'omni' && c.stage === toStage)
    }
    if (pet.attribute2) {
      if (isHiddenEvo) {
        return Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === toStage && c.isHidden
        ) || Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.stage === toStage && c.isHidden
        )
      }
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === toStage && !c.isHidden
      )
    }
    if (isHiddenEvo) {
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.stage === toStage && c.isHidden
      )
    }
    return Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === toStage && !c.isHidden
    )
  }

  // ─── 진화 가능 여부 ───────────────────────────────────────────────────
  canEvolve(pet) {
    const charData = this._findCharData(pet)
    if (!charData || charData.nextId === null) return false

    return (
      pet.level    >= charData.evolveLevel &&
      pet.affinity >= charData.evolveAffinity
    )
  }

  // ─── 진화 실행 ────────────────────────────────────────────────────────
  // evoType: 'normal' | 'hidden'
  // pet.is_hidden = 1 인 경우에도 히든 트랙 유지 (evoType 무관)
  evolve(pet, evoType = 'normal') {
    const fromStage   = pet.evolution_stage
    const toStage     = fromStage + 1
    const isHiddenEvo = evoType === 'hidden' || pet.is_hidden === 1

    const bonus    = isHiddenEvo ? (HIDDEN_BONUS[toStage] || 0) : 0
    const nextChar = this._findNextChar(pet, isHiddenEvo)

    const updates = {
      evolution_stage: toStage,
      hp:      Math.ceil(pet.hp      * (1 + bonus)),
      mp:      Math.ceil(pet.mp      * (1 + bonus)),
      attack:  Math.ceil(pet.attack  * (1 + bonus)),
      defense: Math.ceil(pet.defense * (1 + bonus)),
      speed:   Math.ceil(pet.speed   * (1 + bonus)),
    }
    if (isHiddenEvo) updates.is_hidden = 1
    if (nextChar)    updates.name = nextChar.name

    this.Pet.updatePet(pet.id, updates)

    const logType = isHiddenEvo ? 'hidden' : 'normal'
    db.run(
      `INSERT INTO evolution_log (pet_id, from_stage, to_stage, evo_type, evolved_at)
       VALUES (?, ?, ?, ?, ?)`,
      [pet.id, fromStage, toStage, logType, Date.now()]
    )

    this.save()
    return { fromStage, toStage, evoType: logType, bonus }
  }

  // ─── 히든 분기 조건 검사 (노말 트랙 펫에서만 호출) ────────────────────
  checkHiddenConditions(pet) {
    const charData = this._findCharData(pet)
    if (!charData?.hiddenConditions?.length) return false

    return charData.hiddenConditions.every(cond => {
      switch (cond.type) {
        case 'high_affinity':
          return (pet.affinity || 0) >= cond.value

        case 'has_item': {
          const row = db.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total FROM pet_inventory WHERE pet_id = ? AND item_id = ?',
            [pet.id, cond.itemId]
          )[0]
          return Number(row?.total ?? 0) > 0
        }

        case 'battle_wins': {
          const row = db.query(
            "SELECT COALESCE(SUM(count), 0) AS total FROM daily_activity WHERE activity = 'hunt'"
          )[0]
          return Number(row?.total ?? 0) >= cond.value
        }

        case 'age_seconds':
          return (pet.age_seconds || 0) >= cond.value

        case 'all_attributes': {
          // 옴니렉스 전용: 10속성 펫 보유 여부
          const row = db.query(
            'SELECT COUNT(DISTINCT attribute) AS cnt FROM pets WHERE is_alive = 1 OR is_alive IS NULL'
          )[0]
          return Number(row?.cnt ?? 0) >= cond.value
        }

        default:
          return false
      }
    })
  }
}

module.exports = EvolutionSystem
