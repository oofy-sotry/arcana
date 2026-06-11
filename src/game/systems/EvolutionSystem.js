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
  _findCharData(pet) {
    const stage = pet.evolution_stage

    // Omnirex: 키 직접 조회 (일반/히든 구분)
    if (pet.attribute === 'omni') {
      const key = pet.is_hidden ? `omnirex_${stage}_hidden` : `omnirex_${stage}`
      return CHARACTERS[key] ?? null
    }

    // T1/T2 혼합종: species 키 직접 조회 (비히든 트랙)
    if (pet.species && pet.species !== 'default' && !pet.is_hidden) {
      const key = `${pet.species.toLowerCase()}_${stage}`
      if (CHARACTERS[key]) return CHARACTERS[key]
    }

    // 히든 T1 혼합종
    if (pet.attribute2 && pet.is_hidden) {
      return (
        Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === stage && c.isHidden
        ) ||
        Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.stage === stage && c.isHidden
        )
      )
    }

    // 일반 T1 혼합종 (species 조회 실패 시 폴백)
    if (pet.attribute2) {
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === stage && !c.isHidden
      )
    }

    // 히든 단속성
    if (pet.is_hidden) {
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.stage === stage && c.isHidden
      )
    }

    // 일반 단속성
    return Object.values(CHARACTERS).find(
      c => c.attribute === pet.attribute && c.stage === stage && !c.isHidden
    )
  }

  // ─── 다음 스테이지 캐릭터 반환 ────────────────────────────────────────
  _findNextChar(pet, isHiddenEvo) {
    const toStage = pet.evolution_stage + 1

    // Omnirex: 키 직접 조회
    if (pet.attribute === 'omni') {
      if (isHiddenEvo || pet.is_hidden) {
        return CHARACTERS[`omnirex_${toStage}_hidden`] ?? null
      }
      return CHARACTERS[`omnirex_${toStage}`] ?? null
    }

    // T1/T2 혼합종: species 키 직접 조회 (비히든 진화)
    if (pet.species && pet.species !== 'default' && !isHiddenEvo) {
      const key = `${pet.species.toLowerCase()}_${toStage}`
      if (CHARACTERS[key]) return CHARACTERS[key]
    }

    // 히든 T1 혼합종 진화
    if (pet.attribute2 && isHiddenEvo) {
      return (
        Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === toStage && c.isHidden
        ) ||
        Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.stage === toStage && c.isHidden
        )
      )
    }

    // 일반 T1 혼합종 (폴백)
    if (pet.attribute2) {
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.attribute2 === pet.attribute2 && c.stage === toStage && !c.isHidden
      )
    }

    // 히든 단속성 진화
    if (isHiddenEvo || pet.is_hidden) {
      return Object.values(CHARACTERS).find(
        c => c.attribute === pet.attribute && c.stage === toStage && c.isHidden
      )
    }

    // 일반 단속성
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

    // 히든 진화 최초 진입 시 evo_stone 소비
    if (evoType === 'hidden' && pet.is_hidden !== 1) {
      db.run(
        'UPDATE pet_inventory SET quantity = quantity - 1 WHERE pet_id = ? AND item_id = ? AND quantity > 0',
        [pet.id, 'evo_stone']
      )
    }

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

  // ─── 스토리 경로: chaosrex_4 → omnirex_0 변환 ────────────────────────
  // 챕터 5 히든 엔딩 달성 시 호출
  transformToOmnirex(pet) {
    if (pet.species !== 'Chaosrex' || pet.evolution_stage !== 4) {
      return { ok: false, reason: 'not_chaosrex_4' }
    }
    const targetChar = CHARACTERS['omnirex_0']
    this.Pet.updatePet(pet.id, {
      attribute:       'omni',
      attribute2:      null,
      species:         'Omnirex',
      evolution_stage: 0,
      name:            targetChar.name,
      is_hidden:       0,
    })
    db.run(
      `INSERT INTO evolution_log (pet_id, from_stage, to_stage, evo_type, evolved_at)
       VALUES (?, ?, ?, ?, ?)`,
      [pet.id, 4, 0, 'transform', Date.now()]
    )
    this.save()
    return { ok: true, pet: this.Pet.getPet(pet.id) }
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
            "SELECT COALESCE(SUM(count), 0) AS total FROM daily_activity WHERE pet_id = ? AND activity = 'hunt'",
            [pet.id]
          )[0]
          return Number(row?.total ?? 0) >= cond.value
        }

        case 'age_seconds':
          return (pet.age_seconds || 0) >= cond.value

        case 'all_attributes': {
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
