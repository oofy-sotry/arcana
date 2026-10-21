// 진화 단계: 0=유년기, 1=성장기, 2=완전체, 3=궁극체, 4=전설체
// hiddenConditions: 노멀 트랙 → 히든 트랙 분기 조건 (빠를수록 강함)
// isHidden: true → 히든 트랙 캐릭터 (pet.is_hidden=1 펫에서 사용)
// species: 혼합속성·특수 계통 구분자
// attributes: T2 혼합종 전용 다중속성 배열 (3~4속성), attribute는 주속성(하위 호환)

const { HYBRID_TIER2_RESULTS } = require('./breeding')

const CHARACTERS = {

  // ══════════════════════════════════════════════════════════════
  // 일반 속성 8종 — Normal Track (0~4단계)
  // hiddenConditions: 해당 단계에서 히든 트랙으로 분기하기 위한 조건
  // ══════════════════════════════════════════════════════════════

  // 불🔥
  fire_0: { name: '플리크',     attribute: 'fire',  stage: 0, nextId: 'fire_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  fire_1: { name: '블레이온',   attribute: 'fire',  stage: 1, nextId: 'fire_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  fire_2: { name: '피르드락',   attribute: 'fire',  stage: 2, nextId: 'fire_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  fire_3: { name: '페닉사르',   attribute: 'fire',  stage: 3, nextId: 'fire_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  fire_4: { name: '인페르노스', attribute: 'fire',  stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 물💧
  water_0: { name: '듀이',      attribute: 'water', stage: 0, nextId: 'water_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  water_1: { name: '타이달린',  attribute: 'water', stage: 1, nextId: 'water_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  water_2: { name: '커렌티스',  attribute: 'water', stage: 2, nextId: 'water_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  water_3: { name: '어비시온',  attribute: 'water', stage: 3, nextId: 'water_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  water_4: { name: '토렌시스',  attribute: 'water', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 바람🌪️
  wind_0: { name: '브리지',       attribute: 'wind', stage: 0, nextId: 'wind_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  wind_1: { name: '게일온',       attribute: 'wind', stage: 1, nextId: 'wind_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  wind_2: { name: '스톰카이트',   attribute: 'wind', stage: 2, nextId: 'wind_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  wind_3: { name: '스카이렌티스', attribute: 'wind', stage: 3, nextId: 'wind_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  wind_4: { name: '사이클로시스', attribute: 'wind', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 땅🌍
  earth_0: { name: '머디',        attribute: 'earth', stage: 0, nextId: 'earth_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  earth_1: { name: '록온',        attribute: 'earth', stage: 1, nextId: 'earth_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  earth_2: { name: '테라키스',    attribute: 'earth', stage: 2, nextId: 'earth_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  earth_3: { name: '마운틴악스',  attribute: 'earth', stage: 3, nextId: 'earth_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  earth_4: { name: '세이스모스',  attribute: 'earth', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 번개⚡
  thunder_0: { name: '스파키',    attribute: 'thunder', stage: 0, nextId: 'thunder_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  thunder_1: { name: '볼트린',    attribute: 'thunder', stage: 1, nextId: 'thunder_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  thunder_2: { name: '선더악스',  attribute: 'thunder', stage: 2, nextId: 'thunder_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  thunder_3: { name: '스톰켁스',  attribute: 'thunder', stage: 3, nextId: 'thunder_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  thunder_4: { name: '뇌신로스',  attribute: 'thunder', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 얼음❄️
  ice_0: { name: '스노렛',       attribute: 'ice', stage: 0, nextId: 'ice_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  ice_1: { name: '프로스틴',     attribute: 'ice', stage: 1, nextId: 'ice_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  ice_2: { name: '글레이시키스', attribute: 'ice', stage: 2, nextId: 'ice_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  ice_3: { name: '블리자렉스',   attribute: 'ice', stage: 3, nextId: 'ice_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  ice_4: { name: '글레이시로스', attribute: 'ice', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 독☠️
  poison_0: { name: '톡시',          attribute: 'poison', stage: 0, nextId: 'poison_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  poison_1: { name: '베놈린',        attribute: 'poison', stage: 1, nextId: 'poison_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  poison_2: { name: '서펜톡스',      attribute: 'poison', stage: 2, nextId: 'poison_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  poison_3: { name: '플레이그렉스',  attribute: 'poison', stage: 3, nextId: 'poison_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  poison_4: { name: '톡세모스',      attribute: 'poison', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 드래곤🐉
  dragon_0: { name: '드래글링',    attribute: 'dragon', stage: 0, nextId: 'dragon_1', evolveLevel: 10, evolveAffinity: 20,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 80 }] },
  dragon_1: { name: '드라콜린',    attribute: 'dragon', stage: 1, nextId: 'dragon_2', evolveLevel: 25, evolveAffinity: 40,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 70 }] },
  dragon_2: { name: '드라고바르',  attribute: 'dragon', stage: 2, nextId: 'dragon_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  dragon_3: { name: '아르카드락스', attribute: 'dragon', stage: 3, nextId: 'dragon_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  dragon_4: { name: '드라고렉스',  attribute: 'dragon', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },


  // ══════════════════════════════════════════════════════════════
  // 히든 트랙 8종 — Hidden Track (1H~4H단계)
  // 히든 트랙은 hiddenConditions 없음 — 일반 레벨/친밀도 조건으로 다음 히든 단계 진화
  // 히든 트랙 진화 조건: 일반보다 조금 높은 레벨·친밀도 요구
  // ══════════════════════════════════════════════════════════════

  // 불 히든🔥
  fire_1H: { name: '이그나론',    attribute: 'fire', stage: 1, isHidden: true, nextId: 'fire_2H', evolveLevel: 30, evolveAffinity: 50 },
  fire_2H: { name: '말레피르',    attribute: 'fire', stage: 2, isHidden: true, nextId: 'fire_3H', evolveLevel: 50, evolveAffinity: 70 },
  fire_3H: { name: '인페락시스',  attribute: 'fire', stage: 3, isHidden: true, nextId: 'fire_4H', evolveLevel: 75, evolveAffinity: 85 },
  fire_4H: { name: '에루프티오스', attribute: 'fire', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 물 히든💧
  water_1H: { name: '아비달린',   attribute: 'water', stage: 1, isHidden: true, nextId: 'water_2H', evolveLevel: 30, evolveAffinity: 50 },
  water_2H: { name: '딥티스',     attribute: 'water', stage: 2, isHidden: true, nextId: 'water_3H', evolveLevel: 50, evolveAffinity: 70 },
  water_3H: { name: '크라켄시스', attribute: 'water', stage: 3, isHidden: true, nextId: 'water_4H', evolveLevel: 75, evolveAffinity: 85 },
  water_4H: { name: '아비소스',   attribute: 'water', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 바람 히든🌪️
  wind_1H: { name: '게일론',       attribute: 'wind', stage: 1, isHidden: true, nextId: 'wind_2H', evolveLevel: 30, evolveAffinity: 50 },
  wind_2H: { name: '스톰락스',     attribute: 'wind', stage: 2, isHidden: true, nextId: 'wind_3H', evolveLevel: 50, evolveAffinity: 70 },
  wind_3H: { name: '사이클락스',   attribute: 'wind', stage: 3, isHidden: true, nextId: 'wind_4H', evolveLevel: 75, evolveAffinity: 85 },
  wind_4H: { name: '사이클로이오스', attribute: 'wind', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 땅 히든🌍
  earth_1H: { name: '테라론',      attribute: 'earth', stage: 1, isHidden: true, nextId: 'earth_2H', evolveLevel: 30, evolveAffinity: 50 },
  earth_2H: { name: '어비스테라',  attribute: 'earth', stage: 2, isHidden: true, nextId: 'earth_3H', evolveLevel: 50, evolveAffinity: 70 },
  earth_3H: { name: '그라비락스',  attribute: 'earth', stage: 3, isHidden: true, nextId: 'earth_4H', evolveLevel: 75, evolveAffinity: 85 },
  earth_4H: { name: '보이드테라',  attribute: 'earth', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 번개 히든⚡
  thunder_1H: { name: '볼트론',     attribute: 'thunder', stage: 1, isHidden: true, nextId: 'thunder_2H', evolveLevel: 30, evolveAffinity: 50 },
  thunder_2H: { name: '네크로볼트', attribute: 'thunder', stage: 2, isHidden: true, nextId: 'thunder_3H', evolveLevel: 50, evolveAffinity: 70 },
  thunder_3H: { name: '말레시온',   attribute: 'thunder', stage: 3, isHidden: true, nextId: 'thunder_4H', evolveLevel: 75, evolveAffinity: 85 },
  thunder_4H: { name: '보이드닝',   attribute: 'thunder', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 얼음 히든❄️
  ice_1H: { name: '프로스트론',  attribute: 'ice', stage: 1, isHidden: true, nextId: 'ice_2H', evolveLevel: 30, evolveAffinity: 50 },
  ice_2H: { name: '크리오시스',  attribute: 'ice', stage: 2, isHidden: true, nextId: 'ice_3H', evolveLevel: 50, evolveAffinity: 70 },
  ice_3H: { name: '크리오악스',  attribute: 'ice', stage: 3, isHidden: true, nextId: 'ice_4H', evolveLevel: 75, evolveAffinity: 85 },
  ice_4H: { name: '크리오렉스',  attribute: 'ice', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 독 히든☠️
  poison_1H: { name: '베놈론',    attribute: 'poison', stage: 1, isHidden: true, nextId: 'poison_2H', evolveLevel: 30, evolveAffinity: 50 },
  poison_2H: { name: '네크로독스', attribute: 'poison', stage: 2, isHidden: true, nextId: 'poison_3H', evolveLevel: 50, evolveAffinity: 70 },
  poison_3H: { name: '네크로시스', attribute: 'poison', stage: 3, isHidden: true, nextId: 'poison_4H', evolveLevel: 75, evolveAffinity: 85 },
  poison_4H: { name: '타나토스',  attribute: 'poison', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 드래곤 히든🐉
  dragon_1H: { name: '드라크론',   attribute: 'dragon', stage: 1, isHidden: true, nextId: 'dragon_2H', evolveLevel: 30, evolveAffinity: 50 },
  dragon_2H: { name: '아르카드락', attribute: 'dragon', stage: 2, isHidden: true, nextId: 'dragon_3H', evolveLevel: 50, evolveAffinity: 70 },
  dragon_3H: { name: '카오스드라크', attribute: 'dragon', stage: 3, isHidden: true, nextId: 'dragon_4H', evolveLevel: 75, evolveAffinity: 85 },
  dragon_4H: { name: '아비스드락', attribute: 'dragon', stage: 4, isHidden: true, nextId: null, evolveLevel: null, evolveAffinity: null },


  // ══════════════════════════════════════════════════════════════
  // 히든 속성 2종 — light / dark (태어나기 희귀, Luxis·Noctis 세력 연동)
  // ══════════════════════════════════════════════════════════════

  // 빛🌟 (Luxis계, luxis_rep 50+ 시 출생 확률 상승)
  light_0: { name: '루시나',   attribute: 'light', stage: 0, nextId: 'light_1', evolveLevel: 12, evolveAffinity: 25,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 85 }] },
  light_1: { name: '루미아',   attribute: 'light', stage: 1, nextId: 'light_2', evolveLevel: 28, evolveAffinity: 45,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 75 }] },
  light_2: { name: '오로라크', attribute: 'light', stage: 2, nextId: 'light_3', evolveLevel: 50, evolveAffinity: 65,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 92 }] },
  light_3: { name: '아스트렉스', attribute: 'light', stage: 3, nextId: 'light_4', evolveLevel: 72, evolveAffinity: 82,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 60 }, { type: 'age_seconds', value: 5400 }] },
  light_4: { name: '룩시오스', attribute: 'light', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 어둠🌑 (Noctis계, noctis_rep 50+ 시 출생 확률 상승)
  dark_0: { name: '노크티아', attribute: 'dark', stage: 0, nextId: 'dark_1', evolveLevel: 12, evolveAffinity: 25,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 85 }] },
  dark_1: { name: '옴브론',   attribute: 'dark', stage: 1, nextId: 'dark_2', evolveLevel: 28, evolveAffinity: 45,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 75 }] },
  dark_2: { name: '샤도렉',   attribute: 'dark', stage: 2, nextId: 'dark_3', evolveLevel: 50, evolveAffinity: 65,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 92 }] },
  dark_3: { name: '노크렉스', attribute: 'dark', stage: 3, nextId: 'dark_4', evolveLevel: 72, evolveAffinity: 82,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 60 }, { type: 'age_seconds', value: 5400 }] },
  dark_4: { name: '아비수스', attribute: 'dark', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },


  // ══════════════════════════════════════════════════════════════
  // 혼합 속성 14종 — Hybrid Species (불호환 교배 3% 확률 탄생)
  // attribute + attribute2 조합, species 필드로 진화 경로 구분
  // ══════════════════════════════════════════════════════════════

  // 증기 (fire+water)
  steamar_0: { name: '퍼피',     attribute: 'fire', attribute2: 'water', species: 'Steamar', stage: 0, nextId: 'steamar_1', evolveLevel: 10, evolveAffinity: 20 },
  steamar_1: { name: '스팀린',   attribute: 'fire', attribute2: 'water', species: 'Steamar', stage: 1, nextId: 'steamar_2', evolveLevel: 25, evolveAffinity: 40 },
  steamar_2: { name: '볼카마르', attribute: 'fire', attribute2: 'water', species: 'Steamar', stage: 2, nextId: 'steamar_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  steamar_3: { name: '지오스팀', attribute: 'fire', attribute2: 'water', species: 'Steamar', stage: 3, nextId: 'steamar_4', evolveLevel: 70, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'battle_wins', value: 50 }, { type: 'age_seconds', value: 3600 }] },
  steamar_4: { name: '스팀렉스', attribute: 'fire', attribute2: 'water', species: 'Steamar', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 마그마 (fire+ice)
  magmaron_0: { name: '마그렛',    attribute: 'fire', attribute2: 'ice', species: 'Magmaron', stage: 0, nextId: 'magmaron_1', evolveLevel: 10, evolveAffinity: 20 },
  magmaron_1: { name: '마그마린',  attribute: 'fire', attribute2: 'ice', species: 'Magmaron', stage: 1, nextId: 'magmaron_2', evolveLevel: 25, evolveAffinity: 40 },
  magmaron_2: { name: '볼케이론',  attribute: 'fire', attribute2: 'ice', species: 'Magmaron', stage: 2, nextId: 'magmaron_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  magmaron_3: { name: '마그마사르', attribute: 'fire', attribute2: 'ice', species: 'Magmaron', stage: 3, nextId: 'magmaron_4', evolveLevel: 70, evolveAffinity: 80 },
  magmaron_4: { name: '인페르론',  attribute: 'fire', attribute2: 'ice', species: 'Magmaron', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 지옥화 (dark+fire)
  helflaron_0: { name: '헬렛',      attribute: 'dark', attribute2: 'fire', species: 'Helflaron', stage: 0, nextId: 'helflaron_1', evolveLevel: 10, evolveAffinity: 20 },
  helflaron_1: { name: '헬플레어',  attribute: 'dark', attribute2: 'fire', species: 'Helflaron', stage: 1, nextId: 'helflaron_2', evolveLevel: 25, evolveAffinity: 40 },
  helflaron_2: { name: '인페르락',  attribute: 'dark', attribute2: 'fire', species: 'Helflaron', stage: 2, nextId: 'helflaron_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  helflaron_3: { name: '말레플레임', attribute: 'dark', attribute2: 'fire', species: 'Helflaron', stage: 3, nextId: 'helflaron_4', evolveLevel: 70, evolveAffinity: 80 },
  helflaron_4: { name: '헬플라로스', attribute: 'dark', attribute2: 'fire', species: 'Helflaron', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 폭풍해 (thunder+water)
  stormtidex_0: { name: '스톰렛',    attribute: 'thunder', attribute2: 'water', species: 'Stormtidex', stage: 0, nextId: 'stormtidex_1', evolveLevel: 10, evolveAffinity: 20 },
  stormtidex_1: { name: '타이스톰',  attribute: 'thunder', attribute2: 'water', species: 'Stormtidex', stage: 1, nextId: 'stormtidex_2', evolveLevel: 25, evolveAffinity: 40 },
  stormtidex_2: { name: '볼텍시스', attribute: 'thunder', attribute2: 'water', species: 'Stormtidex', stage: 2, nextId: 'stormtidex_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  stormtidex_3: { name: '스톰타이달', attribute: 'thunder', attribute2: 'water', species: 'Stormtidex', stage: 3, nextId: 'stormtidex_4', evolveLevel: 70, evolveAffinity: 80 },
  stormtidex_4: { name: '티달렉스', attribute: 'thunder', attribute2: 'water', species: 'Stormtidex', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 산성 (poison+water)
  acidrax_0: { name: '애시드렛', attribute: 'poison', attribute2: 'water', species: 'Acidrax', stage: 0, nextId: 'acidrax_1', evolveLevel: 10, evolveAffinity: 20 },
  acidrax_1: { name: '애시드린', attribute: 'poison', attribute2: 'water', species: 'Acidrax', stage: 1, nextId: 'acidrax_2', evolveLevel: 25, evolveAffinity: 40 },
  acidrax_2: { name: '코로시스', attribute: 'poison', attribute2: 'water', species: 'Acidrax', stage: 2, nextId: 'acidrax_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  acidrax_3: { name: '애시드렉스', attribute: 'poison', attribute2: 'water', species: 'Acidrax', stage: 3, nextId: 'acidrax_4', evolveLevel: 70, evolveAffinity: 80 },
  acidrax_4: { name: '카오시드',   attribute: 'poison', attribute2: 'water', species: 'Acidrax', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 사막폭풍 (earth+wind)
  sandorrex_0: { name: '샌드렛',    attribute: 'earth', attribute2: 'wind', species: 'Sandorrex', stage: 0, nextId: 'sandorrex_1', evolveLevel: 10, evolveAffinity: 20 },
  sandorrex_1: { name: '샌드게일',  attribute: 'earth', attribute2: 'wind', species: 'Sandorrex', stage: 1, nextId: 'sandorrex_2', evolveLevel: 25, evolveAffinity: 40 },
  sandorrex_2: { name: '사막테라',  attribute: 'earth', attribute2: 'wind', species: 'Sandorrex', stage: 2, nextId: 'sandorrex_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  sandorrex_3: { name: '볼텍테라',  attribute: 'earth', attribute2: 'wind', species: 'Sandorrex', stage: 3, nextId: 'sandorrex_4', evolveLevel: 70, evolveAffinity: 80 },
  sandorrex_4: { name: '샌드렉스',  attribute: 'earth', attribute2: 'wind', species: 'Sandorrex', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 독풍 (poison+wind)
  venomstrix_0: { name: '베놈렛',    attribute: 'poison', attribute2: 'wind', species: 'Venomstrix', stage: 0, nextId: 'venomstrix_1', evolveLevel: 10, evolveAffinity: 20 },
  venomstrix_1: { name: '베놈스트림', attribute: 'poison', attribute2: 'wind', species: 'Venomstrix', stage: 1, nextId: 'venomstrix_2', evolveLevel: 25, evolveAffinity: 40 },
  venomstrix_2: { name: '독기시스',  attribute: 'poison', attribute2: 'wind', species: 'Venomstrix', stage: 2, nextId: 'venomstrix_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  venomstrix_3: { name: '베놈스톰',  attribute: 'poison', attribute2: 'wind', species: 'Venomstrix', stage: 3, nextId: 'venomstrix_4', evolveLevel: 70, evolveAffinity: 80 },
  venomstrix_4: { name: '스트릭스',  attribute: 'poison', attribute2: 'wind', species: 'Venomstrix', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 금속 (earth+thunder)
  metalrox_0: { name: '메탈렛',    attribute: 'earth', attribute2: 'thunder', species: 'Metalrox', stage: 0, nextId: 'metalrox_1', evolveLevel: 10, evolveAffinity: 20 },
  metalrox_1: { name: '메탈록',    attribute: 'earth', attribute2: 'thunder', species: 'Metalrox', stage: 1, nextId: 'metalrox_2', evolveLevel: 25, evolveAffinity: 40 },
  metalrox_2: { name: '아이언테라', attribute: 'earth', attribute2: 'thunder', species: 'Metalrox', stage: 2, nextId: 'metalrox_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  metalrox_3: { name: '메탈리온',  attribute: 'earth', attribute2: 'thunder', species: 'Metalrox', stage: 3, nextId: 'metalrox_4', evolveLevel: 70, evolveAffinity: 80 },
  metalrox_4: { name: '스틸렉스',  attribute: 'earth', attribute2: 'thunder', species: 'Metalrox', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 극한폭풍 (ice+thunder)
  frostoltex_0: { name: '프로스트렛',  attribute: 'ice', attribute2: 'thunder', species: 'Frostoltex', stage: 0, nextId: 'frostoltex_1', evolveLevel: 10, evolveAffinity: 20 },
  frostoltex_1: { name: '아이스볼트',  attribute: 'ice', attribute2: 'thunder', species: 'Frostoltex', stage: 1, nextId: 'frostoltex_2', evolveLevel: 25, evolveAffinity: 40 },
  frostoltex_2: { name: '극한빙결',    attribute: 'ice', attribute2: 'thunder', species: 'Frostoltex', stage: 2, nextId: 'frostoltex_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  frostoltex_3: { name: '블리자볼트',  attribute: 'ice', attribute2: 'thunder', species: 'Frostoltex', stage: 3, nextId: 'frostoltex_4', evolveLevel: 70, evolveAffinity: 80 },
  frostoltex_4: { name: '프로스텍스',  attribute: 'ice', attribute2: 'thunder', species: 'Frostoltex', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 빙결룡 (dragon+ice)
  glacidrax_0: { name: '빙결렛',    attribute: 'dragon', attribute2: 'ice', species: 'Glacidrax', stage: 0, nextId: 'glacidrax_1', evolveLevel: 10, evolveAffinity: 20 },
  glacidrax_1: { name: '글레이드락', attribute: 'dragon', attribute2: 'ice', species: 'Glacidrax', stage: 1, nextId: 'glacidrax_2', evolveLevel: 25, evolveAffinity: 40 },
  glacidrax_2: { name: '아이스드락', attribute: 'dragon', attribute2: 'ice', species: 'Glacidrax', stage: 2, nextId: 'glacidrax_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  glacidrax_3: { name: '빙결사르',  attribute: 'dragon', attribute2: 'ice', species: 'Glacidrax', stage: 3, nextId: 'glacidrax_4', evolveLevel: 70, evolveAffinity: 80 },
  glacidrax_4: { name: '글레이시렉스', attribute: 'dragon', attribute2: 'ice', species: 'Glacidrax', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 신성독 (light+poison)
  sacrotox_0: { name: '성독렛',    attribute: 'light', attribute2: 'poison', species: 'Sacrotox', stage: 0, nextId: 'sacrotox_1', evolveLevel: 12, evolveAffinity: 25 },
  sacrotox_1: { name: '루시독',    attribute: 'light', attribute2: 'poison', species: 'Sacrotox', stage: 1, nextId: 'sacrotox_2', evolveLevel: 28, evolveAffinity: 45 },
  sacrotox_2: { name: '신성톡시스', attribute: 'light', attribute2: 'poison', species: 'Sacrotox', stage: 2, nextId: 'sacrotox_3', evolveLevel: 50, evolveAffinity: 65,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  sacrotox_3: { name: '성독렉스',  attribute: 'light', attribute2: 'poison', species: 'Sacrotox', stage: 3, nextId: 'sacrotox_4', evolveLevel: 72, evolveAffinity: 82 },
  sacrotox_4: { name: '사크로스',  attribute: 'light', attribute2: 'poison', species: 'Sacrotox', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 독룡 (dragon+poison)
  venomrex_0: { name: '베놈렉',   attribute: 'dragon', attribute2: 'poison', species: 'Venomrex', stage: 0, nextId: 'venomrex_1', evolveLevel: 10, evolveAffinity: 20 },
  venomrex_1: { name: '독드라콜', attribute: 'dragon', attribute2: 'poison', species: 'Venomrex', stage: 1, nextId: 'venomrex_2', evolveLevel: 25, evolveAffinity: 40 },
  venomrex_2: { name: '베놈드락', attribute: 'dragon', attribute2: 'poison', species: 'Venomrex', stage: 2, nextId: 'venomrex_3', evolveLevel: 45, evolveAffinity: 60,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  venomrex_3: { name: '독룡시스', attribute: 'dragon', attribute2: 'poison', species: 'Venomrex', stage: 3, nextId: 'venomrex_4', evolveLevel: 70, evolveAffinity: 80 },
  venomrex_4: { name: '베놈렉스', attribute: 'dragon', attribute2: 'poison', species: 'Venomrex', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 암흑룡 (dark+dragon)
  shadowrex_0: { name: '섀도렉',    attribute: 'dark', attribute2: 'dragon', species: 'Shadowrex', stage: 0, nextId: 'shadowrex_1', evolveLevel: 12, evolveAffinity: 25 },
  shadowrex_1: { name: '섀도드라크', attribute: 'dark', attribute2: 'dragon', species: 'Shadowrex', stage: 1, nextId: 'shadowrex_2', evolveLevel: 28, evolveAffinity: 45 },
  shadowrex_2: { name: '암흑드락',  attribute: 'dark', attribute2: 'dragon', species: 'Shadowrex', stage: 2, nextId: 'shadowrex_3', evolveLevel: 50, evolveAffinity: 65,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  shadowrex_3: { name: '노크드라코스', attribute: 'dark', attribute2: 'dragon', species: 'Shadowrex', stage: 3, nextId: 'shadowrex_4', evolveLevel: 72, evolveAffinity: 82 },
  shadowrex_4: { name: '섀도렉스',  attribute: 'dark', attribute2: 'dragon', species: 'Shadowrex', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },

  // 카오스 (dark+light) — 빛과 어둠의 융합, 가장 강한 혼합 속성
  chaosrex_0: { name: '카오렛',    attribute: 'dark', attribute2: 'light', species: 'Chaosrex', stage: 0, nextId: 'chaosrex_1', evolveLevel: 15, evolveAffinity: 30 },
  chaosrex_1: { name: '카오드락',  attribute: 'dark', attribute2: 'light', species: 'Chaosrex', stage: 1, nextId: 'chaosrex_2', evolveLevel: 35, evolveAffinity: 55 },
  chaosrex_2: { name: '카오스락',  attribute: 'dark', attribute2: 'light', species: 'Chaosrex', stage: 2, nextId: 'chaosrex_3', evolveLevel: 55, evolveAffinity: 72,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 95 }] },
  chaosrex_3: { name: '카오렉시스', attribute: 'dark', attribute2: 'light', species: 'Chaosrex', stage: 3, nextId: 'chaosrex_4', evolveLevel: 75, evolveAffinity: 88 },
  chaosrex_4: { name: '카오스렉스', attribute: 'dark', attribute2: 'light', species: 'Chaosrex', stage: 4, nextId: null, evolveLevel: null, evolveAffinity: null },


  // ══════════════════════════════════════════════════════════════
  // 최종 형태 — Omnirex (전속성)
  // 획득 경로:
  //   A. 교배: 양쪽 부모 hybrid + 계보에 10속성 전부 존재 + hybrid 확률
  //   B. 스토리: 챕터5 히든 엔딩 + chaosrex_4 보유 → 변환
  // ══════════════════════════════════════════════════════════════

  // ── 일반 Omnirex (0~4단계) ──────────────────────────────────
  omnirex_0: { name: '아르카 에그',       attribute: 'omni', species: 'Omnirex', stage: 0, nextId: 'omnirex_1', evolveLevel: 30, evolveAffinity: 60 },
  omnirex_1: { name: '아르카 유아체',     attribute: 'omni', species: 'Omnirex', stage: 1, nextId: 'omnirex_2', evolveLevel: 50, evolveAffinity: 70,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 90 }] },
  omnirex_2: { name: '아르카 각성체',     attribute: 'omni', species: 'Omnirex', stage: 2, nextId: 'omnirex_3', evolveLevel: 65, evolveAffinity: 80,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 93 }] },
  omnirex_3: { name: '아르카 완전체',     attribute: 'omni', species: 'Omnirex', stage: 3, nextId: 'omnirex_4', evolveLevel: 80, evolveAffinity: 90,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 97 }] },
  omnirex_4: { name: '아르카나 옴니렉스', attribute: 'omni', species: 'Omnirex', stage: 4, nextId: null,         evolveLevel: null, evolveAffinity: null },

  // ── 히든 Omnirex (0~4단계) — 스탯 일반 대비 40% 강함 ────────
  omnirex_0_hidden: { name: '균열 에그',      attribute: 'omni', species: 'OmnirexHidden', stage: 0, isHidden: true, nextId: 'omnirex_1_hidden', evolveLevel: 40, evolveAffinity: 75 },
  omnirex_1_hidden: { name: '균열 유아체',    attribute: 'omni', species: 'OmnirexHidden', stage: 1, isHidden: true, nextId: 'omnirex_2_hidden', evolveLevel: 60, evolveAffinity: 85,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 95 }] },
  omnirex_2_hidden: { name: '균열 각성체',    attribute: 'omni', species: 'OmnirexHidden', stage: 2, isHidden: true, nextId: 'omnirex_3_hidden', evolveLevel: 75, evolveAffinity: 92,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 97 }] },
  omnirex_3_hidden: { name: '균열 완전체',    attribute: 'omni', species: 'OmnirexHidden', stage: 3, isHidden: true, nextId: 'omnirex_4_hidden', evolveLevel: 90, evolveAffinity: 97,
    hiddenConditions: [{ type: 'has_item', itemId: 'evo_stone' }, { type: 'high_affinity', value: 99 }] },
  omnirex_4_hidden: { name: '균열 옴니렉스',  attribute: 'omni', species: 'OmnirexHidden', stage: 4, isHidden: true, nextId: null,               evolveLevel: null, evolveAffinity: null },
}

// ══════════════════════════════════════════════════════════════
// T2 혼합종 91종 — 자동 생성 (HYBRID_TIER2_RESULTS 기반)
// Dominant(3속성) / Balanced(4속성) 진화 요구치 분리
// T2는 히든 트랙 없음 — 교배 자체가 극히 낮은 확률이므로
// attribute = 주속성(하위 호환), attributes = 전체 속성 배열
// ══════════════════════════════════════════════════════════════
;(function _buildT2() {
  const DOMINANT_EVO = [
    { level: 15, aff: 30 },
    { level: 35, aff: 50 },
    { level: 55, aff: 70 },
    { level: 75, aff: 85 },
  ]
  const BALANCED_EVO = [
    { level: 20, aff: 35 },
    { level: 40, aff: 55 },
    { level: 60, aff: 75 },
    { level: 80, aff: 88 },
  ]
  const SUFFIXES = ['에그', '유아체', '각성체', '완전체', '초월체']

  for (const t2 of Object.values(HYBRID_TIER2_RESULTS)) {
    const baseId      = t2.species.toLowerCase()
    const evo         = t2.isDominant ? DOMINANT_EVO : BALANCED_EVO
    const primaryAttr = t2.isDominant ? t2.dominantAttr : t2.attributes[0]

    for (let s = 0; s <= 4; s++) {
      const isLast = s === 4
      const entry = {
        name:           `${t2.name} ${SUFFIXES[s]}`,
        attribute:      primaryAttr,
        attributes:     t2.attributes,
        species:        t2.species,
        stage:          s,
        nextId:         isLast ? null : `${baseId}_${s + 1}`,
        evolveLevel:    isLast ? null : evo[s].level,
        evolveAffinity: isLast ? null : evo[s].aff,
      }
      // 2단계 이상에서만 진화석 + 친밀도 조건 (T2는 히든 분기 없으므로 단순 조건)
      if (!isLast && s >= 2) {
        entry.hiddenConditions = [
          { type: 'has_item',      itemId: 'evo_stone' },
          { type: 'high_affinity', value: t2.isDominant ? 90 : 92 },
        ]
      }
      CHARACTERS[`${baseId}_${s}`] = entry
    }
  }
})()

module.exports = CHARACTERS
