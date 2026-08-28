const MAX_PARTY_SIZE = 3

// 속성별 파티 시너지 (Tier 1: 중복 속성)
// partyBonus: 소환사 스탯 party_bonus — 투자 포인트당 시너지 배율 +1%
function calcSynergy(pets, partyBonus = 0) {
  const attrCount = {}
  pets.forEach(p => {
    attrCount[p.attribute] = (attrCount[p.attribute] || 0) + 1
  })
  const extra = partyBonus * 0.01

  const bonuses = []
  Object.entries(attrCount).forEach(([attr, count]) => {
    if (count === 2) bonuses.push({ attr, type: 'double', damageMult: 1.10 + extra, desc: `${attr} 2마리: 데미지 +10%` })
    if (count >= 3) bonuses.push({ attr, type: 'triple', damageMult: 1.20 + extra, cdReduction: 0.20, desc: `${attr} 3마리: 데미지 +20%, 쿨다운 -20%` })
  })
  return bonuses
}

class PartySystem {
  constructor({ Pet, save, summonerSystem }) {
    this.Pet  = Pet
    this.save = save
    this.summonerSystem = summonerSystem || null
  }

  getParty() {
    const db = require('../../db/database')
    const members = db.query(
      `SELECT pm.slot, p.* FROM party_members pm JOIN pets p ON pm.pet_id = p.id ORDER BY pm.slot`
    )
    const partyBonus = this.summonerSystem?.getActiveStat('party_bonus') || 0
    return { members, synergy: calcSynergy(members, partyBonus) }
  }

  addToParty(petId, slot) {
    if (slot < 0 || slot >= MAX_PARTY_SIZE) return { error: `슬롯은 0~${MAX_PARTY_SIZE - 1} 사이여야 합니다` }

    const pet = this.Pet.getPet(petId)
    if (!pet || !pet.is_alive) return { error: '유효한 펫이 아닙니다' }

    const db = require('../../db/database')
    const existing = db.query(`SELECT * FROM party_members WHERE pet_id = ?`, [petId])
    if (existing.length > 0) return { error: `${pet.name}은 이미 파티에 있습니다` }

    const slotTaken = db.query(`SELECT * FROM party_members WHERE slot = ?`, [slot])
    if (slotTaken.length > 0) {
      db.run(`DELETE FROM party_members WHERE slot = ?`, [slot])
    }

    const partySize = db.query(`SELECT COUNT(*) AS cnt FROM party_members`)[0]?.cnt ?? 0
    if (partySize >= MAX_PARTY_SIZE && slotTaken.length === 0) {
      return { error: `파티는 최대 ${MAX_PARTY_SIZE}마리입니다` }
    }

    db.run(
      `INSERT INTO party_members (pet_id, slot, added_at) VALUES (?, ?, ?)`,
      [petId, slot, Date.now()]
    )
    this.save()
    return this.getParty()
  }

  removeFromParty(petId) {
    const db = require('../../db/database')
    db.run(`DELETE FROM party_members WHERE pet_id = ?`, [petId])
    this.save()
    return this.getParty()
  }

  clearParty() {
    const db = require('../../db/database')
    db.run(`DELETE FROM party_members`)
    this.save()
    return this.getParty()
  }
}

module.exports = PartySystem
