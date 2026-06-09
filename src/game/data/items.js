// type: 'consumable' | 'material' | 'key'
// effect: 문자열 키 → ItemSystem.useItem 에서 switch 처리
// tradeable: Phase 6 교환 가능 여부

const ITEMS = {
  // 생존
  life_charm:   { name: '생명의 부적',  type: 'consumable', effect: 'death_rate_down', maxStack: 10, tradeable: false },
  revive_stone: { name: '부활석',       type: 'consumable', effect: 'revive',          maxStack: 3,  tradeable: false },

  // 진화
  evo_stone:    { name: '진화의 돌',    type: 'consumable', effect: 'evolve_boost',    maxStack: 5,  tradeable: true },
  dark_evo_crystal: { name: '진화의 저주석', type: 'consumable', effect: 'dark_evolve', maxStack: 1, tradeable: false },

  // 컨디션 회복
  pet_food:     { name: '펫 사료',      type: 'consumable', effect: 'hunger_restore',  maxStack: 99, tradeable: true },
  pet_soap:     { name: '펫 비누',      type: 'consumable', effect: 'clean_restore',   maxStack: 99, tradeable: true },
  happy_toy:    { name: '즐거운 장난감', type: 'consumable', effect: 'happy_restore',  maxStack: 30, tradeable: true },

  // 에너지
  energy_potion:{ name: '에너지 물약',  type: 'consumable', effect: 'energy_restore',  maxStack: 50, tradeable: true },
}

module.exports = ITEMS
