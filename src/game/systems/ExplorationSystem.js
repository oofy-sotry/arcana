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

  // 가중치 기반 랜덤 이벤트 선택, dropBoost = item/coins 확률 증폭 비율
  rollEvent(dropBoost = 0) {
    const weighted = EVENTS.map(e => {
      let w = e.weight
      if ((e.type === 'item' || e.type === 'coins') && dropBoost > 0) {
        w = Math.floor(w * (1 + dropBoost))
      }
      return { ...e, w }
    })
    const total  = weighted.reduce((s, e) => s + e.w, 0)
    let roll     = Math.random() * total
    let selected = weighted[weighted.length - 1]
    for (const event of weighted) {
      roll -= event.w
      if (roll <= 0) { selected = event; break }
    }

    if (selected.type === 'item') {
      const pool   = selected.items
      const itemId = pool[Math.floor(Math.random() * pool.length)]
      return { type: 'item', itemId }
    }
    if (selected.type === 'coins') {
      return { type: 'coins', coins: 5 + Math.floor(Math.random() * 20) }
    }
    if (selected.type === 'trap') {
      return { type: 'trap', damage: 5 + Math.floor(Math.random() * 15) }
    }
    return { type: 'empty' }
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
      this.Pet.updatePet(pet.id, { coins: (pet.coins || 0) + result.coins })
    } else if (result.type === 'trap') {
      const newHp = Math.max(1, pet.hp - result.damage)
      this.Pet.updatePet(pet.id, { hp: newHp })
    }

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [newEnergy, pet.id])
    this.save()
    return { ...result, finalEnergy: newEnergy }
  }

  // 에너지 -13, 드롭 2~10% (dropBoost 0.5), 특수 이벤트 확률 상승
  manualExplore(pet) {
    const db     = require('../../db/database')
    const energy = pet.energy != null ? pet.energy : 100
    if (energy < MANUAL_ENERGY_COST) return { error: '에너지 부족 (수동 탐사: -13 필요)' }

    const newEnergy = energy - MANUAL_ENERGY_COST
    const result    = this.rollEvent(0.5)

    if (result.type === 'item') {
      this.itemSystem.addItem(pet.id, result.itemId, 1)
    } else if (result.type === 'coins') {
      this.Pet.updatePet(pet.id, { coins: (pet.coins || 0) + result.coins })
    } else if (result.type === 'trap') {
      const newHp = Math.max(1, pet.hp - result.damage)
      this.Pet.updatePet(pet.id, { hp: newHp })
    }

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [newEnergy, pet.id])
    this.save()
    return { ...result, finalEnergy: newEnergy }
  }
}

module.exports = ExplorationSystem
