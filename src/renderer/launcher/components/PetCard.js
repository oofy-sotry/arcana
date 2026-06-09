const STAGE_NAMES = ['유년기', '성장기', '완전체', '궁극체', '전설체']
const ATTR_EMOJI  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉' }

class PetCard {
  constructor(pet, onSelect) {
    this.pet      = pet
    this.onSelect = onSelect
  }
}
