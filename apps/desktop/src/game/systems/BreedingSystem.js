const {
  COMPAT_PROBS,
  HYBRID_RESULTS,
  HYBRID_TIER2_RESULTS,
  getCompat,
  getHybridResult,
  getHybridTier2Result,
  getCompatKey,
  calcHybridChance,
} = require('../data/breeding')

const BASIC_ATTRS         = ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon']
const HYBRID_MAX_BREEDING = 2  // T1 혼합종
const T2_MAX_BREEDING     = 1  // T2 혼합종 (교배 1회만 허용)

const T1_SPECIES = new Set([
  'Steamar', 'Magmaron', 'Helflaron', 'Stormtidex', 'Acidrax',
  'Sandorrex', 'Venomstrix', 'Metalrox', 'Frostoltex', 'Glacidrax',
  'Sacrotox', 'Venomrex', 'Shadowrex', 'Chaosrex',
])

const T2_BALANCED_SPECIES = new Set(
  Object.values(HYBRID_TIER2_RESULTS)
    .filter(t2 => !t2.isDominant)
    .map(t2 => t2.species)
)

class BreedingSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  canBreed(pet, batchCount = 1) {
    return Number(pet.is_alive) === 1 && (pet.max_breeding - pet.used_breeding) >= batchCount
  }

  // 교배 호환 정보 반환 (UI 표시용)
  getCompatInfo(pet1, pet2) {
    const maxBatch = Math.min(
      pet1.max_breeding - pet1.used_breeding,
      pet2.max_breeding - pet2.used_breeding
    )

    if (T1_SPECIES.has(pet1.species) && T1_SPECIES.has(pet2.species)) {
      const t2Result = getHybridTier2Result(pet1.species, pet2.species)
      return { compat: 'T2', t2Result, hybridResult: null, maxBatch }
    }

    if (T2_BALANCED_SPECIES.has(pet1.species) && T2_BALANCED_SPECIES.has(pet2.species)) {
      return { compat: 'Omni', omnirexChance: true, hybridResult: null, maxBatch }
    }

    const compat       = getCompat(pet1.attribute, pet2.attribute)
    const hybridResult = getHybridResult(pet1.attribute, pet2.attribute)
    return { compat, hybridResult, maxBatch }
  }

  // 교배 실행
  breed(pet1, pet2, batchCount = 1) {
    if (pet1.id === pet2.id) {
      return { ok: false, error: '같은 펫끼리는 교배할 수 없습니다' }
    }

    if (this._getStoryChapter() < 6) {
      return { ok: false, error: '스토리 챕터 5를 완료해야 교배 기능이 해금됩니다.' }
    }

    if (!this.canBreed(pet1, batchCount)) {
      return { ok: false, error: `${pet1.name}의 교배 횟수가 부족합니다 (남은 횟수: ${pet1.max_breeding - pet1.used_breeding})` }
    }
    if (!this.canBreed(pet2, batchCount)) {
      return { ok: false, error: `${pet2.name}의 교배 횟수가 부족합니다 (남은 횟수: ${pet2.max_breeding - pet2.used_breeding})` }
    }

    const { attribute, attribute2, species, isT2, isOmnirex } = this._rollChildAttr(pet1, pet2, batchCount)

    const childName = this._generateChildName(pet1.name, pet2.name)
    const child     = this.Pet.createPet(childName, attribute, species !== 'default' ? species : 'default')

    const childUpdates = { parent1_id: pet1.id, parent2_id: pet2.id }
    if (isOmnirex) {
      childUpdates.max_breeding = 0
    } else if (isT2) {
      childUpdates.max_breeding = T2_MAX_BREEDING
    } else if (attribute2) {
      childUpdates.attribute2   = attribute2
      childUpdates.max_breeding = HYBRID_MAX_BREEDING
    }
    this.Pet.updatePet(child.id, childUpdates)

    // DB 최신값 재조회 후 차감 (연속 호출 시 메모리 스냅샷 오버카운트 방지)
    const fresh1 = this.Pet.getPet(pet1.id)
    const fresh2 = this.Pet.getPet(pet2.id)
    this.Pet.updatePet(pet1.id, { used_breeding: fresh1.used_breeding + batchCount })
    this.Pet.updatePet(pet2.id, { used_breeding: fresh2.used_breeding + batchCount })

    const db = require('../../db/database')
    db.run(
      `INSERT INTO breeding_log
         (parent1_id, parent2_id, child_id, batch_count, result_attribute, result_attribute2, result_species, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pet1.id, pet2.id, child.id, batchCount, attribute, attribute2 || null,
       species !== 'default' ? species : null, Date.now()]
    )

    this.save()

    const isHybrid = !!attribute2
    const hybridName = isHybrid
      ? HYBRID_RESULTS[getCompatKey(pet1.attribute, pet2.attribute)]?.name ?? null
      : null

    let t2Name = null
    if (isT2 && !isOmnirex) {
      t2Name = getHybridTier2Result(pet1.species, pet2.species)?.name ?? null
    }

    return {
      ok: true,
      child:     this.Pet.getPet(child.id),
      isHybrid,
      hybridName,
      isT2:      !!isT2,
      t2Name,
      isOmnirex: !!isOmnirex,
      batchCount,
    }
  }

  getLineage(petId) {
    const db = require('../../db/database')
    return db.query(
      `SELECT * FROM breeding_log WHERE parent1_id=? OR parent2_id=? OR child_id=?`,
      [petId, petId, petId]
    )
  }

  _rollChildAttr(pet1, pet2, batchCount) {
    // T1 × T1 → T2 시도
    if (T1_SPECIES.has(pet1.species) && T1_SPECIES.has(pet2.species)) {
      return this._rollT2(pet1, pet2)
    }

    // T2 Balanced × T2 Balanced → Omnirex 시도
    if (T2_BALANCED_SPECIES.has(pet1.species) && T2_BALANCED_SPECIES.has(pet2.species)) {
      if (Math.random() < 0.03) {
        return { attribute: 'omni', attribute2: null, species: 'Omnirex', isOmnirex: true }
      }
      // 실패 시 부모 T2 중 한쪽 계승
      const parent = Math.random() < 0.5 ? pet1 : pet2
      return { attribute: parent.attribute, attribute2: null, species: parent.species, isT2: true }
    }

    return this._rollNormal(pet1.attribute, pet2.attribute, batchCount)
  }

  _rollT2(pet1, pet2) {
    if (Math.random() < 0.03) {
      const t2 = getHybridTier2Result(pet1.species, pet2.species)
      if (t2) {
        const primaryAttr = t2.isDominant ? t2.dominantAttr : t2.attributes[0]
        return { attribute: primaryAttr, attribute2: null, species: t2.species, isT2: true }
      }
    }
    // 실패 시 부모 4속성 중 랜덤 1개 계승
    const allAttrs = [...new Set(
      [pet1.attribute, pet1.attribute2, pet2.attribute, pet2.attribute2].filter(Boolean)
    )]
    const attr = allAttrs[Math.floor(Math.random() * allAttrs.length)]
    return { attribute: attr, attribute2: null, species: 'default' }
  }

  _rollNormal(attr1, attr2, batchCount) {
    const compat       = getCompat(attr1, attr2)
    const probs        = COMPAT_PROBS[compat]
    const hybridChance = calcHybridChance(attr1, attr2, batchCount)

    if (hybridChance > 0 && Math.random() < hybridChance) {
      const hybrid = getHybridResult(attr1, attr2)
      if (hybrid) return hybrid
    }

    if (Math.random() < probs.inheritChance) {
      const attr = Math.random() < 0.5 ? attr1 : attr2
      return { attribute: attr, attribute2: null, species: 'default' }
    }

    const attr = BASIC_ATTRS[Math.floor(Math.random() * BASIC_ATTRS.length)]
    return { attribute: attr, attribute2: null, species: 'default' }
  }

  _getStoryChapter() {
    const db   = require('../../db/database')
    const rows = db.query('SELECT value FROM world_state WHERE key = ?', ['story_chapter'])
    return rows.length > 0 ? Number(rows[0].value) : 0
  }

  _generateChildName(name1, name2) {
    const half1 = name1.slice(0, Math.ceil(name1.length / 2))
    const half2 = name2.slice(Math.floor(name2.length / 2))
    return (half1 + half2).slice(0, 8)
  }
}

module.exports = BreedingSystem
