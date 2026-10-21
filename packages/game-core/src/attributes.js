const ATTRS        = ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon']
const ATTRS_ALL    = [...ATTRS, 'light', 'dark', 'omni']

// AFFINITY[attacker][defender] = 상성배율 (1.3 유리 / 1.0 중립 / 0.77 불리)
// light/dark는 monsters.js ATTRIBUTE_MATCHUP(1.25/0.8 체계)를 1.3/0.77로 정규화
const AFFINITY = {
  fire:    { fire:1.0,  water:0.77, wind:1.3,  earth:0.77, thunder:1.3,  ice:0.77, poison:1.3,  dragon:0.77, light:0.77, dark:1.3,  omni:1.0 },
  water:   { fire:1.3,  water:1.0,  wind:0.77, earth:1.3,  thunder:0.77, ice:1.0,  poison:0.77, dragon:1.3,  light:1.0,  dark:1.0,  omni:1.0 },
  wind:    { fire:0.77, water:1.3,  wind:1.0,  earth:0.77, thunder:1.3,  ice:1.0,  poison:0.77, dragon:1.3,  light:1.0,  dark:1.0,  omni:1.0 },
  earth:   { fire:1.0,  water:0.77, wind:1.3,  earth:1.0,  thunder:0.77, ice:1.3,  poison:1.3,  dragon:1.0,  light:1.0,  dark:1.0,  omni:1.0 },
  thunder: { fire:1.0,  water:1.3,  wind:0.77, earth:1.3,  thunder:1.0,  ice:0.77, poison:1.0,  dragon:1.3,  light:1.0,  dark:0.77, omni:1.0 },
  ice:     { fire:0.77, water:1.0,  wind:1.0,  earth:0.77, thunder:1.3,  ice:1.0,  poison:1.0,  dragon:0.77, light:1.3,  dark:1.3,  omni:1.0 },
  poison:  { fire:1.0,  water:1.3,  wind:1.3,  earth:0.77, thunder:1.0,  ice:1.0,  poison:1.0,  dragon:0.77, light:0.77, dark:1.3,  omni:1.0 },
  dragon:  { fire:1.3,  water:0.77, wind:0.77, earth:1.0,  thunder:0.77, ice:1.3,  poison:1.3,  dragon:1.0,  light:1.0,  dark:0.77, omni:1.0 },
  // 빛: 기본 8속성에 약간 유리, 어둠에 강함(1.3), 어둠에 약함(0.77)
  light:   { fire:1.3,  water:1.0,  wind:1.0,  earth:1.0,  thunder:1.0,  ice:0.77, poison:1.3,  dragon:1.0,  light:1.0,  dark:1.3,  omni:1.0 },
  // 어둠: 빛에 강함(1.3), 번개·얼음에 약함
  dark:    { fire:0.77, water:1.0,  wind:1.0,  earth:1.0,  thunder:1.3,  ice:0.77, poison:0.77, dragon:1.3,  light:1.3,  dark:1.0,  omni:1.0 },
  // 옴니: 10속성 전부 흡수 — 모든 속성에 2.0x 유리 (공격 배율)
  omni:    { fire:2.0,  water:2.0,  wind:2.0,  earth:2.0,  thunder:2.0,  ice:2.0,  poison:2.0,  dragon:2.0,  light:2.0,  dark:2.0,  omni:1.0 },
}

function getMultiplier(attackerAttr, defenderAttr) {
  const row = AFFINITY[attackerAttr]
  if (!row) return 1.0
  return row[defenderAttr] ?? 1.0
}

function isFavorable(attackerAttr, defenderAttr) {
  return getMultiplier(attackerAttr, defenderAttr) >= 1.3
}

module.exports = { ATTRS, ATTRS_ALL, AFFINITY, getMultiplier, isFavorable }
