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
}

module.exports = HuntingSystem
