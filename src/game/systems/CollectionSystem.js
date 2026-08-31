const db = require('../../db/database')
const CHARACTERS = require('../data/characters')

const BASE_ATTRS = ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon', 'light', 'dark']

class CollectionSystem {
  // 기본 10속성 × 5단계 도감 항목 — pets/evolution_log에서 발견 여부를 파생
  // (소프트 삭제된 죽은 펫도 pets 행이 남아있어 발견 기록이 사라지지 않음)
  getBaseLineEntries() {
    const discovered = new Set(
      db.query(`
        SELECT DISTINCT p.attribute AS attribute, x.stage AS stage
        FROM pets p
        JOIN (
          SELECT id AS pet_id, evolution_stage AS stage FROM pets
          UNION ALL SELECT pet_id, from_stage AS stage FROM evolution_log
          UNION ALL SELECT pet_id, to_stage   AS stage FROM evolution_log
        ) x ON x.pet_id = p.id
        WHERE p.species = 'default' AND p.attribute2 IS NULL AND p.is_hidden = 0
      `).map(r => `${r.attribute}_${r.stage}`)
    )

    return BASE_ATTRS.flatMap(attribute =>
      [0, 1, 2, 3, 4].map(stage => {
        const id  = `${attribute}_${stage}`
        const seen = discovered.has(id)
        return { id, attribute, stage, discovered: seen, name: seen ? CHARACTERS[id].name : null }
      })
    )
  }
}

module.exports = CollectionSystem
