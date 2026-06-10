const {
  COMPAT_PROBS,
  HYBRID_RESULTS,
  getCompat,
  getHybridResult,
  getCompatKey,
  calcHybridChance,
} = require('../data/breeding')

const BASIC_ATTRS = ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon']
const HYBRID_MAX_BREEDING = 2 // 혼합속성 펫은 교배 횟수 제한

class BreedingSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  // 교배 가능 여부 확인
  canBreed(pet, batchCount = 1) {
    return pet.is_alive === 1 && (pet.max_breeding - pet.used_breeding) >= batchCount
  }

  // 두 펫의 호환 정보 반환 (UI 표시용)
  getCompatInfo(pet1, pet2) {
    const compat      = getCompat(pet1.attribute, pet2.attribute)
    const hybridResult = getHybridResult(pet1.attribute, pet2.attribute)
    const maxBatch    = Math.min(
      pet1.max_breeding - pet1.used_breeding,
      pet2.max_breeding - pet2.used_breeding
    )
    return { compat, hybridResult, maxBatch }
  }

  // 교배 실행 (batchCount: 몰빵 시 한 번에 소진할 교배 횟수)
  breed(pet1, pet2, batchCount = 1) {
    if (pet1.id === pet2.id) return { error: '같은 펫끼리는 교배할 수 없습니다' }
    if (!this.canBreed(pet1, batchCount)) {
      return { error: `${pet1.name}의 교배 횟수가 부족합니다 (남은 횟수: ${pet1.max_breeding - pet1.used_breeding})` }
    }
    if (!this.canBreed(pet2, batchCount)) {
      return { error: `${pet2.name}의 교배 횟수가 부족합니다 (남은 횟수: ${pet2.max_breeding - pet2.used_breeding})` }
    }

    const { attribute, attribute2, species } = this._rollChildAttr(
      pet1.attribute, pet2.attribute, batchCount
    )

    const childName    = this._generateChildName(pet1.name, pet2.name)
    const childSpecies = species !== 'default' ? species : 'default'
    const child        = this.Pet.createPet(childName, attribute, childSpecies)

    const childUpdates = {
      parent1_id: pet1.id,
      parent2_id: pet2.id,
    }
    if (attribute2) {
      childUpdates.attribute2    = attribute2
      childUpdates.max_breeding  = HYBRID_MAX_BREEDING
    }
    this.Pet.updatePet(child.id, childUpdates)

    this.Pet.updatePet(pet1.id, { used_breeding: pet1.used_breeding + batchCount })
    this.Pet.updatePet(pet2.id, { used_breeding: pet2.used_breeding + batchCount })

    const db = require('../../db/database')
    db.run(
      `INSERT INTO breeding_log
         (parent1_id, parent2_id, child_id, batch_count, result_attribute, result_attribute2, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pet1.id, pet2.id, child.id, batchCount, attribute, attribute2 || null, Date.now()]
    )

    this.save()

    const isHybrid   = !!attribute2
    const hybridName = isHybrid
      ? HYBRID_RESULTS[getCompatKey(pet1.attribute, pet2.attribute)]?.name ?? null
      : null

    return {
      child:      this.Pet.getPet(child.id),
      isHybrid,
      hybridName,
      batchCount,
    }
  }

  // 특정 펫의 계보 기록 반환
  getLineage(petId) {
    const db = require('../../db/database')
    return db.query(
      `SELECT * FROM breeding_log WHERE parent1_id=? OR parent2_id=? OR child_id=?`,
      [petId, petId, petId]
    )
  }

  _rollChildAttr(attr1, attr2, batchCount) {
    const compat = getCompat(attr1, attr2)
    const probs  = COMPAT_PROBS[compat]

    const hybridChance = calcHybridChance(attr1, attr2, batchCount)
    if (hybridChance > 0 && Math.random() < hybridChance) {
      const hybrid = getHybridResult(attr1, attr2)
      if (hybrid) return hybrid
    }

    // 부모 속성 계승 or 랜덤
    if (Math.random() < probs.inheritChance) {
      const attr = Math.random() < 0.5 ? attr1 : attr2
      return { attribute: attr, attribute2: null, species: 'default' }
    }

    const attr = BASIC_ATTRS[Math.floor(Math.random() * BASIC_ATTRS.length)]
    return { attribute: attr, attribute2: null, species: 'default' }
  }

  _generateChildName(name1, name2) {
    const half1 = name1.slice(0, Math.ceil(name1.length / 2))
    const half2 = name2.slice(Math.floor(name2.length / 2))
    return (half1 + half2).slice(0, 8)
  }
}

module.exports = BreedingSystem
