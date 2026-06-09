const { ZONES, MONSTERS } = require('../data/monsters')

const AUTO_ENERGY_COST   = 30
const MANUAL_ENERGY_COST = 15
const MANUAL_DROP_BONUS  = 0.20

class HuntingSystem {
  constructor({ Pet, save, combatSystem }) {
    this.Pet          = Pet
    this.save         = save
    this.combatSystem = combatSystem
    this._activeHunts = new Map() // petId → { zoneId, huntLogId }
  }

  // 입장 가능 구역 목록 — 펫 레벨을 기준으로 필터링 없이 모두 반환 (난이도는 사용자가 판단)
  getZones() {
    return ZONES
  }

  // 구역에서 랜덤 몬스터 1마리 선택
  spawnMonster(zoneId) {
    const zone = ZONES.find(z => z.id === zoneId)
    if (!zone) return null
    const ids    = zone.monsterIds
    const chosen = ids[Math.floor(Math.random() * ids.length)]
    return MONSTERS.find(m => m.id === chosen) || null
  }

  // 에너지 소진까지 전투를 반복 실행, hunt_log 저장
  startAutoHunt(pet, zoneId) {
    const db      = require('../../db/database')
    const energy  = pet.energy != null ? pet.energy : 100
    if (energy < AUTO_ENERGY_COST) return { error: '에너지 부족 (자동 사냥: -30 필요)' }

    const startedAt = Date.now()
    db.run(
      `INSERT INTO hunt_log (pet_id, zone_id, mode, started_at) VALUES (?,?,?,?)`,
      [pet.id, zoneId, 'auto', startedAt]
    )
    const huntLogId = db.query('SELECT last_insert_rowid() AS id')[0]?.id

    let currentEnergy = energy
    const battles = []

    while (currentEnergy >= AUTO_ENERGY_COST) {
      const monster = this.spawnMonster(zoneId)
      if (!monster) break
      currentEnergy -= AUTO_ENERGY_COST
      const outcome = this.combatSystem.runAutoFight(
        { ...pet, energy: currentEnergy },
        monster,
        { mode: 'auto', huntLogId }
      )
      battles.push({ monster: monster.name, ...outcome })
      if (outcome.result === 'lost') break
      pet = this.Pet.findById(pet.id)
      if (!pet) break
    }

    db.run(
      `UPDATE hunt_log SET ended_at=?, result=? WHERE id=?`,
      [Date.now(), battles.at(-1)?.result || 'stopped', huntLogId]
    )
    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [currentEnergy, pet.id])
    this.save()
    return { battles, finalEnergy: currentEnergy }
  }

  // 진행 중인 자동 사냥 상태 정리 (타이머 기반 확장 시 사용)
  stopAutoHunt(petId) {
    const hunt = this._activeHunts.get(petId)
    if (!hunt) return
    this._activeHunts.delete(petId)
  }
}

module.exports = HuntingSystem
