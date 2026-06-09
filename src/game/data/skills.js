// unlockStage: 해금 진화 단계 (0=유년기, 1=성장기, 2=완전체, 3=궁극체, 4=전설체)
// coefficient: 기본 계수 (스킬 강화 시 +0.1/포인트, 최대 1.5)
// type: 'active' | 'passive' | 'buff'

const SKILLS = {
  // 불🔥
  fire_shot:    { name: '불꽃 발사',  attribute: 'fire',  type: 'active',  power: 20, mpCost: 10, unlockStage: 1, coefficient: 1.0 },
  fire_aura:    { name: '불꽃 오라',  attribute: 'fire',  type: 'passive', power: 5,  mpCost: 0,  unlockStage: 2, coefficient: 1.0 },
  fire_boost:   { name: '연소 강화',  attribute: 'fire',  type: 'buff',    power: 0,  mpCost: 15, unlockStage: 3, coefficient: 1.0 },
  fire_burst:   { name: '폭염 폭발',  attribute: 'fire',  type: 'active',  power: 50, mpCost: 30, unlockStage: 4, coefficient: 1.0 },

  // 물💧
  water_jet:    { name: '물 분사',    attribute: 'water', type: 'active',  power: 18, mpCost: 10, unlockStage: 1, coefficient: 1.0 },
  water_shield: { name: '수류 방어',  attribute: 'water', type: 'passive', power: 5,  mpCost: 0,  unlockStage: 2, coefficient: 1.0 },
  water_heal:   { name: '정수 회복',  attribute: 'water', type: 'buff',    power: 20, mpCost: 20, unlockStage: 3, coefficient: 1.0 },
  tidal_wave:   { name: '해일',       attribute: 'water', type: 'active',  power: 55, mpCost: 35, unlockStage: 4, coefficient: 1.0 },

  // 바람🌪️
  wind_slash:   { name: '바람 베기',  attribute: 'wind',  type: 'active',  power: 16, mpCost: 8,  unlockStage: 1, coefficient: 1.0 },
  wind_dodge:   { name: '기류 회피',  attribute: 'wind',  type: 'passive', power: 0,  mpCost: 0,  unlockStage: 2, coefficient: 1.0 },
  wind_speed:   { name: '폭풍 가속',  attribute: 'wind',  type: 'buff',    power: 0,  mpCost: 12, unlockStage: 3, coefficient: 1.0 },
  cyclone:      { name: '사이클론',   attribute: 'wind',  type: 'active',  power: 45, mpCost: 28, unlockStage: 4, coefficient: 1.0 },

  // 땅🌍
  rock_throw:   { name: '돌 던지기',  attribute: 'earth', type: 'active',  power: 22, mpCost: 10, unlockStage: 1, coefficient: 1.0 },
  earth_armor:  { name: '대지 갑옷',  attribute: 'earth', type: 'passive', power: 8,  mpCost: 0,  unlockStage: 2, coefficient: 1.0 },
  quake_field:  { name: '지진 구역',  attribute: 'earth', type: 'buff',    power: 0,  mpCost: 18, unlockStage: 3, coefficient: 1.0 },
  earthquake:   { name: '대지진',     attribute: 'earth', type: 'active',  power: 60, mpCost: 40, unlockStage: 4, coefficient: 1.0 },
}

module.exports = SKILLS
