// 진화 단계: 0=유년기, 1=성장기, 2=완전체, 3=궁극체, 4=전설체
// evolveLevel/evolveAffinity: 다음 단계로 진화하기 위한 최소 조건
// hiddenConditions: 히든 진화 조건 배열 (Phase 2에서는 구조만 정의)

const CHARACTERS = {
  // 불🔥
  fire_0: { name: '플리크',     attribute: 'fire',  stage: 0, nextId: 'fire_1', evolveLevel: 10, evolveAffinity: 20 },
  fire_1: { name: '블레이온',   attribute: 'fire',  stage: 1, nextId: 'fire_2', evolveLevel: 25, evolveAffinity: 40 },
  fire_2: { name: '피르드락',   attribute: 'fire',  stage: 2, nextId: 'fire_3', evolveLevel: 45, evolveAffinity: 60 },
  fire_3: { name: '페닉사르',   attribute: 'fire',  stage: 3, nextId: 'fire_4', evolveLevel: 70, evolveAffinity: 80 },
  fire_4: { name: '인페르노스', attribute: 'fire',  stage: 4, nextId: null,    evolveLevel: null, evolveAffinity: null },

  // 물💧
  water_0: { name: '듀이',      attribute: 'water', stage: 0, nextId: 'water_1', evolveLevel: 10, evolveAffinity: 20 },
  water_1: { name: '타이달린',  attribute: 'water', stage: 1, nextId: 'water_2', evolveLevel: 25, evolveAffinity: 40 },
  water_2: { name: '커렌티스',  attribute: 'water', stage: 2, nextId: 'water_3', evolveLevel: 45, evolveAffinity: 60 },
  water_3: { name: '어비시온',  attribute: 'water', stage: 3, nextId: 'water_4', evolveLevel: 70, evolveAffinity: 80 },
  water_4: { name: '토렌시스',  attribute: 'water', stage: 4, nextId: null,     evolveLevel: null, evolveAffinity: null },

  // 바람🌪️
  wind_0: { name: '브리지',       attribute: 'wind', stage: 0, nextId: 'wind_1', evolveLevel: 10, evolveAffinity: 20 },
  wind_1: { name: '게일온',       attribute: 'wind', stage: 1, nextId: 'wind_2', evolveLevel: 25, evolveAffinity: 40 },
  wind_2: { name: '스톰카이트',   attribute: 'wind', stage: 2, nextId: 'wind_3', evolveLevel: 45, evolveAffinity: 60 },
  wind_3: { name: '스카이렌티스', attribute: 'wind', stage: 3, nextId: 'wind_4', evolveLevel: 70, evolveAffinity: 80 },
  wind_4: { name: '사이클로시스', attribute: 'wind', stage: 4, nextId: null,    evolveLevel: null, evolveAffinity: null },
}

module.exports = CHARACTERS
