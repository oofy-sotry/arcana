const AUTO_ENERGY_COST   = 25
const MANUAL_ENERGY_COST = 13

// 이벤트별 기본 가중치 (자동 탐사 기준)
const EVENTS = [
  { type: 'item',  weight: 15, items: ['pet_food', 'pet_soap', 'happy_toy', 'energy_potion'] },
  { type: 'coins', weight: 25 },
  { type: 'trap',  weight: 15 },
  { type: 'empty', weight: 45 },
]

class ExplorationSystem {
  constructor({ Pet, save, itemSystem }) {
    this.Pet        = Pet
    this.save       = save
    this.itemSystem = itemSystem
  }

  // 에너지 -25, 드롭 1~5% 확률로 아이템 발견
  startAutoExplore(pet) {
    const db     = require('../../db/database')
    const energy = pet.energy != null ? pet.energy : 100
    if (energy < AUTO_ENERGY_COST) return { error: '에너지 부족 (자동 탐사: -25 필요)' }

    const newEnergy = energy - AUTO_ENERGY_COST
    const result    = this.rollEvent(0.05)

    if (result.type === 'item') {
      this.itemSystem.addItem(pet.id, result.itemId, 1)
    } else if (result.type === 'coins') {
      this.Pet.update(pet.id, { coins: (pet.coins || 0) + result.coins })
    } else if (result.type === 'trap') {
      const newHp = Math.max(1, pet.hp - result.damage)
      this.Pet.update(pet.id, { hp: newHp })
    }

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [newEnergy, pet.id])
    this.save()
    return { ...result, finalEnergy: newEnergy }
  }
}

module.exports = ExplorationSystem
