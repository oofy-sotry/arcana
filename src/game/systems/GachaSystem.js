const GACHA_COST_SINGLE = 100
const GACHA_COST_TEN    = 900 // 10% 할인

// 가챠 속성 드롭 가중치 (일반 8속성)
const ATTR_POOL = [
  { attribute: 'fire',    weight: 15 },
  { attribute: 'water',   weight: 15 },
  { attribute: 'wind',    weight: 15 },
  { attribute: 'earth',   weight: 15 },
  { attribute: 'thunder', weight: 12 },
  { attribute: 'ice',     weight: 12 },
  { attribute: 'poison',  weight: 10 },
  { attribute: 'dragon',  weight: 6  },
]

// 가챠 진화단계 가중치 (0=유년기 위주)
const STAGE_POOL = [
  { stage: 0, weight: 60 }, // 유년기
  { stage: 1, weight: 30 }, // 성장기
  { stage: 2, weight: 8  }, // 완전체
  { stage: 3, weight: 2  }, // 궁극체
]

const STAGE_NAMES = ['유년기', '성장기', '완전체', '궁극체', '전설체']

function weightedPick(pool) {
  if (!pool || pool.length === 0) throw new Error('weightedPick: empty pool')
  const total = pool.reduce((s, e) => s + e.weight, 0)
  let roll    = Math.random() * total
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return pool[pool.length - 1]
}

class GachaSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  // 단일 가챠 (100코인)
  rollSingle(ownerPetId) {
    return this._doRoll(ownerPetId, 1, GACHA_COST_SINGLE)
  }

  // 10연 가챠 (900코인, 4성+ 1마리 보장)
  rollTen(ownerPetId) {
    return this._doRoll(ownerPetId, 10, GACHA_COST_TEN)
  }

  _doRoll(ownerPetId, count, cost) {
    const owner = this.Pet.getPet(ownerPetId)
    if (!owner) return { error: '펫을 찾을 수 없습니다' }
    if ((owner.coins || 0) < cost) return { error: `코인이 부족합니다 (필요: ${cost}, 보유: ${owner.coins || 0})` }

    const results = []
    try {
      for (let i = 0; i < count; i++) {
        const forcedHighStage = count === 10 && i === count - 1
        results.push(this._spawnPet(forcedHighStage))
      }
    } catch (err) {
      // 펫 생성 실패 시 코인 차감 없이 종료
      return { error: `소환 중 오류가 발생했습니다: ${err.message}` }
    }

    this.Pet.updatePet(ownerPetId, { coins: (owner.coins || 0) - cost })

    const db = require('../../db/database')
    results.forEach(pet => {
      db.run(
        `INSERT INTO gacha_log (pet_id, owner_pet_id, cost_coins, roll_count, created_at) VALUES (?, ?, ?, ?, ?)`,
        [pet.id, ownerPetId, Math.floor(cost / count), count, Date.now()]
      )
    })

    this.save()
    return { pets: results, costCoins: cost }
  }

  _spawnPet(forceHighStage = false) {
    const attrEntry   = weightedPick(ATTR_POOL)
    const stageEntry  = forceHighStage
      ? weightedPick(STAGE_POOL.filter(s => s.stage >= 2))
      : weightedPick(STAGE_POOL)

    const attr    = attrEntry.attribute
    const stage   = stageEntry.stage
    const name    = `${STAGE_NAMES[stage]} ${attr}형`
    const pet     = this.Pet.createPet(name, attr, 'default')

    if (stage > 0) this.Pet.updatePet(pet.id, { evolution_stage: stage, level: stage * 10 + 1 })

    return this.Pet.getPet(pet.id)
  }
}

module.exports = GachaSystem
