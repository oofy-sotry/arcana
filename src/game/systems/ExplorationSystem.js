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
}

module.exports = ExplorationSystem
