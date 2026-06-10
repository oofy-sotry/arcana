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

  startAutoExplore(pet) {
    return this._explore(pet, AUTO_ENERGY_COST, 0.05, '자동 탐사: -25 필요')
  }

  manualExplore(pet) {
    return this._explore(pet, MANUAL_ENERGY_COST, 0.5, '수동 탐사: -13 필요')
  }

  _explore(pet, energyCost, dropBoost, errLabel) {
    const db     = require('../../db/database')
    const energy = pet.conditions?.energy ?? 100
    if (energy < energyCost) return { error: `에너지 부족 (${errLabel})` }

    const newEnergy = energy - energyCost
    const result    = this.rollEvent(dropBoost)

    if (result.type === 'item') {
      this.itemSystem.addItem(pet.id, result.itemId, 1)
      this.Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.5) })
    } else if (result.type === 'coins') {
      this.Pet.updatePet(pet.id, { coins: (pet.coins || 0) + result.coins, affinity: Math.min(100, (pet.affinity || 0) + 0.5) })
    } else if (result.type === 'trap') {
      this.Pet.updatePet(pet.id, { hp: Math.max(1, pet.hp - result.damage) })
    }

    db.run(`UPDATE pet_conditions SET energy=? WHERE pet_id=?`, [newEnergy, pet.id])
    this.save()
    return { ...result, finalEnergy: newEnergy }
  }
}

module.exports = ExplorationSystem
