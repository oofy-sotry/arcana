// 몬스터 스탯 기준: 레벨 × 계수로 스케일링
// tier 1=입문(Lv1-15), tier 2=일반(Lv16-35), tier 3=고급(Lv36+)

const MONSTERS = [
  // ── 불 ──
  { id: 'fire_slime',   name: '화염 슬라임', attribute: 'fire',  tier: 1, hp: 60,  attack: 12, defense: 4,  exp: 18,  coins: { min: 5,  max: 12 } },
  { id: 'fire_lizard',  name: '불도마뱀',    attribute: 'fire',  tier: 2, hp: 140, attack: 28, defense: 10, exp: 55,  coins: { min: 18, max: 35 } },
  { id: 'fire_dragon',  name: '화룡',        attribute: 'fire',  tier: 3, hp: 320, attack: 60, defense: 22, exp: 150, coins: { min: 60, max: 120 } },

  // ── 물 ──
  { id: 'water_jelly',  name: '물 젤리',     attribute: 'water', tier: 1, hp: 70,  attack: 10, defense: 6,  exp: 16,  coins: { min: 5,  max: 12 } },
  { id: 'jellyfish',    name: '해파리',      attribute: 'water', tier: 2, hp: 130, attack: 25, defense: 12, exp: 50,  coins: { min: 18, max: 35 } },
  { id: 'deep_fish',    name: '심해어',      attribute: 'water', tier: 3, hp: 300, attack: 55, defense: 25, exp: 140, coins: { min: 60, max: 120 } },

  // ── 바람 ──
  { id: 'wind_spirit',  name: '바람 정령',   attribute: 'wind',  tier: 1, hp: 55,  attack: 14, defense: 3,  exp: 20,  coins: { min: 5,  max: 12 } },
  { id: 'storm_bird',   name: '회오리새',    attribute: 'wind',  tier: 2, hp: 120, attack: 30, defense: 8,  exp: 58,  coins: { min: 18, max: 35 } },
  { id: 'gale_eagle',   name: '폭풍독수리',  attribute: 'wind',  tier: 3, hp: 280, attack: 65, defense: 18, exp: 155, coins: { min: 60, max: 120 } },

  // ── 땅 ──
  { id: 'dirt_golem',   name: '흙 골렘',     attribute: 'earth',   tier: 1, hp: 90,  attack: 10, defense: 8,  exp: 18,  coins: { min: 5,  max: 12 } },
  { id: 'stone_monkey', name: '돌 원숭이',   attribute: 'earth',   tier: 2, hp: 160, attack: 22, defense: 15, exp: 52,  coins: { min: 18, max: 35 } },
  { id: 'rock_titan',   name: '암반 타이탄', attribute: 'earth',   tier: 3, hp: 380, attack: 50, defense: 30, exp: 145, coins: { min: 60, max: 120 } },

  // ── 번개 ──
  { id: 'thunder_rat',  name: '번개 쥐',     attribute: 'thunder', tier: 1, hp: 50,  attack: 15, defense: 3,  exp: 20,  coins: { min: 5,  max: 12 } },
  { id: 'electric_snake', name: '전기 뱀',   attribute: 'thunder', tier: 2, hp: 115, attack: 32, defense: 7,  exp: 60,  coins: { min: 18, max: 35 } },
  { id: 'thunder_bird', name: '천둥새',      attribute: 'thunder', tier: 3, hp: 270, attack: 68, defense: 16, exp: 160, coins: { min: 60, max: 120 } },

  // ── 얼음 ──
  { id: 'snow_rabbit',  name: '눈 토끼',     attribute: 'ice',     tier: 1, hp: 65,  attack: 11, defense: 5,  exp: 17,  coins: { min: 5,  max: 12 } },
  { id: 'ice_bear',     name: '얼음 곰',     attribute: 'ice',     tier: 2, hp: 150, attack: 26, defense: 14, exp: 53,  coins: { min: 18, max: 35 } },
  { id: 'frost_dragon', name: '서리 드래곤', attribute: 'ice',     tier: 3, hp: 340, attack: 58, defense: 24, exp: 148, coins: { min: 60, max: 120 } },

  // ── 독 ──
  { id: 'poison_spider', name: '독 거미',    attribute: 'poison',  tier: 1, hp: 55,  attack: 13, defense: 4,  exp: 19,  coins: { min: 5,  max: 12 } },
  { id: 'acid_frog',    name: '산성 개구리', attribute: 'poison',  tier: 2, hp: 125, attack: 29, defense: 9,  exp: 56,  coins: { min: 18, max: 35 } },
  { id: 'venom_naga',   name: '독무 나가',   attribute: 'poison',  tier: 3, hp: 295, attack: 62, defense: 20, exp: 152, coins: { min: 60, max: 120 } },

  // ── 드래곤 ──
  { id: 'dragon_hatch', name: '드래곤 새끼', attribute: 'dragon',  tier: 1, hp: 80,  attack: 13, defense: 7,  exp: 22,  coins: { min: 8,  max: 18 } },
  { id: 'wyvern',       name: '비룡',        attribute: 'dragon',  tier: 2, hp: 170, attack: 30, defense: 13, exp: 65,  coins: { min: 25, max: 50 } },
  { id: 'elder_dragon', name: '고룡',        attribute: 'dragon',  tier: 3, hp: 420, attack: 70, defense: 28, exp: 180, coins: { min: 80, max: 150 } },
]

// 드롭 테이블: 몬스터 tier별 공통 드롭 + 속성별 특수 드롭
// rate: 0.0~1.0 (auto 사냥 기준; manual 시 +20%)
const DROP_TABLES = {
  tier1: [
    { itemId: 'pet_food',  rate: 0.25, quantity: 1 },
    { itemId: 'happy_toy', rate: 0.10, quantity: 1 },
  ],
  tier2: [
    { itemId: 'pet_food',   rate: 0.20, quantity: 1 },
    { itemId: 'pet_soap',   rate: 0.12, quantity: 1 },
    { itemId: 'happy_toy',  rate: 0.08, quantity: 1 },
    { itemId: 'life_charm', rate: 0.05, quantity: 1 },
  ],
  tier3: [
    { itemId: 'pet_food',      rate: 0.18, quantity: 1 },
    { itemId: 'pet_soap',      rate: 0.10, quantity: 1 },
    { itemId: 'life_charm',    rate: 0.08, quantity: 1 },
    { itemId: 'energy_potion', rate: 0.06, quantity: 1 },
    { itemId: 'revive_stone',  rate: 0.02, quantity: 1 },
    { itemId: 'evo_stone',     rate: 0.01, quantity: 1 },
  ],
}

function getDropTable(monsterId) {
  const monster = MONSTERS.find(m => m.id === monsterId)
  if (!monster) return []
  return DROP_TABLES[`tier${monster.tier}`] || []
}

const ZONES = []

function getMonster(id) {
  return MONSTERS.find(m => m.id === id) || null
}

function getZone(id) {
  return ZONES.find(z => z.id === id) || null
}

module.exports = { MONSTERS, ZONES, DROP_TABLES, getMonster, getZone, getDropTable }
