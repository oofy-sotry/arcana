// 진화 단계: 0=유년기, 1=성장기, 2=완전체, 3=궁극체, 4=전설체
// evolveLevel/evolveAffinity: 다음 단계로 진화하기 위한 최소 조건
// hiddenConditions: 히든 진화 조건 배열 (Phase 2에서는 구조만 정의)

const CHARACTERS = {
  // hiddenConditions 공통 정의:
  //   stage 2: [{ type: 'high_affinity', value: 90 }]  — 친밀도 90 이상
  //   stage 3: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }]  — 사냥 50회 + 1시간 이상

  // 불🔥
  fire_0: { name: '플리크',     attribute: 'fire',  stage: 0, nextId: 'fire_1', evolveLevel: 10, evolveAffinity: 20 },
  fire_1: { name: '블레이온',   attribute: 'fire',  stage: 1, nextId: 'fire_2', evolveLevel: 25, evolveAffinity: 40 },
  fire_2: { name: '피르드락',   attribute: 'fire',  stage: 2, nextId: 'fire_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  fire_3: { name: '페닉사르',   attribute: 'fire',  stage: 3, nextId: 'fire_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  fire_4: { name: '인페르노스', attribute: 'fire',  stage: 4, nextId: null,    evolveLevel: null, evolveAffinity: null },

  // 물💧
  water_0: { name: '듀이',      attribute: 'water', stage: 0, nextId: 'water_1', evolveLevel: 10, evolveAffinity: 20 },
  water_1: { name: '타이달린',  attribute: 'water', stage: 1, nextId: 'water_2', evolveLevel: 25, evolveAffinity: 40 },
  water_2: { name: '커렌티스',  attribute: 'water', stage: 2, nextId: 'water_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  water_3: { name: '어비시온',  attribute: 'water', stage: 3, nextId: 'water_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  water_4: { name: '토렌시스',  attribute: 'water', stage: 4, nextId: null,     evolveLevel: null, evolveAffinity: null },

  // 바람🌪️
  wind_0: { name: '브리지',       attribute: 'wind', stage: 0, nextId: 'wind_1', evolveLevel: 10, evolveAffinity: 20 },
  wind_1: { name: '게일온',       attribute: 'wind', stage: 1, nextId: 'wind_2', evolveLevel: 25, evolveAffinity: 40 },
  wind_2: { name: '스톰카이트',   attribute: 'wind', stage: 2, nextId: 'wind_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  wind_3: { name: '스카이렌티스', attribute: 'wind', stage: 3, nextId: 'wind_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  wind_4: { name: '사이클로시스', attribute: 'wind', stage: 4, nextId: null,    evolveLevel: null, evolveAffinity: null },

  // 땅🌍
  earth_0: { name: '머디',       attribute: 'earth', stage: 0, nextId: 'earth_1', evolveLevel: 10, evolveAffinity: 20 },
  earth_1: { name: '록온',       attribute: 'earth', stage: 1, nextId: 'earth_2', evolveLevel: 25, evolveAffinity: 40 },
  earth_2: { name: '테라키스',   attribute: 'earth', stage: 2, nextId: 'earth_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  earth_3: { name: '마운틴악스', attribute: 'earth', stage: 3, nextId: 'earth_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  earth_4: { name: '세이스모스',  attribute: 'earth', stage: 4, nextId: null,     evolveLevel: null, evolveAffinity: null },

  // 번개⚡
  thunder_0: { name: '스파키',    attribute: 'thunder', stage: 0, nextId: 'thunder_1', evolveLevel: 10, evolveAffinity: 20 },
  thunder_1: { name: '볼트린',    attribute: 'thunder', stage: 1, nextId: 'thunder_2', evolveLevel: 25, evolveAffinity: 40 },
  thunder_2: { name: '선더악스',  attribute: 'thunder', stage: 2, nextId: 'thunder_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  thunder_3: { name: '스톰켁스',  attribute: 'thunder', stage: 3, nextId: 'thunder_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  thunder_4: { name: '뇌신로스',  attribute: 'thunder', stage: 4, nextId: null,        evolveLevel: null, evolveAffinity: null },

  // 얼음❄️
  ice_0: { name: '스노렛',      attribute: 'ice', stage: 0, nextId: 'ice_1', evolveLevel: 10, evolveAffinity: 20 },
  ice_1: { name: '프로스틴',    attribute: 'ice', stage: 1, nextId: 'ice_2', evolveLevel: 25, evolveAffinity: 40 },
  ice_2: { name: '글레이시키스', attribute: 'ice', stage: 2, nextId: 'ice_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  ice_3: { name: '블리자렉스',   attribute: 'ice', stage: 3, nextId: 'ice_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  ice_4: { name: '글레이시로스', attribute: 'ice', stage: 4, nextId: null,   evolveLevel: null, evolveAffinity: null },

  // 독☠️
  poison_0: { name: '톡시',         attribute: 'poison', stage: 0, nextId: 'poison_1', evolveLevel: 10, evolveAffinity: 20 },
  poison_1: { name: '베놈린',       attribute: 'poison', stage: 1, nextId: 'poison_2', evolveLevel: 25, evolveAffinity: 40 },
  poison_2: { name: '서펜톡스',     attribute: 'poison', stage: 2, nextId: 'poison_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  poison_3: { name: '플레이그렉스', attribute: 'poison', stage: 3, nextId: 'poison_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  poison_4: { name: '톡세모스',     attribute: 'poison', stage: 4, nextId: null,       evolveLevel: null, evolveAffinity: null },

  // 드래곤🐉
  dragon_0: { name: '드래글링',   attribute: 'dragon', stage: 0, nextId: 'dragon_1', evolveLevel: 10, evolveAffinity: 20 },
  dragon_1: { name: '드라콜린',   attribute: 'dragon', stage: 1, nextId: 'dragon_2', evolveLevel: 25, evolveAffinity: 40 },
  dragon_2: { name: '드라고바르', attribute: 'dragon', stage: 2, nextId: 'dragon_3', evolveLevel: 45, evolveAffinity: 60, hiddenConditions: [{ type: 'high_affinity', value: 90 }] },
  dragon_3: { name: '아르카드락스', attribute: 'dragon', stage: 3, nextId: 'dragon_4', evolveLevel: 70, evolveAffinity: 80, hiddenConditions: [{ type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  dragon_4: { name: '드라고렉스', attribute: 'dragon', stage: 4, nextId: null,       evolveLevel: null, evolveAffinity: null },
}

module.exports = CHARACTERS
