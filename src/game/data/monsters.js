// ══════════════════════════════════════════════════════════════════════
// 몬스터 & 구역 데이터
// 구조: 7 레벨 구간 × 10 속성 = 70개 구역
//       구역당 일반 2종 + 보스 1종 + 히든 에레멘탈 10종
// ══════════════════════════════════════════════════════════════════════

// ── 구간별 기본 스탯 ─────────────────────────────────────────────────
const TIER_BASE = {
  1: { hp: 65,  attack: 12,  defense: 5,  speed: 10, exp: 20,  coins: { min: 5,   max: 15  } },
  2: { hp: 125, attack: 25,  defense: 11, speed: 11, exp: 50,  coins: { min: 15,  max: 35  } },
  3: { hp: 215, attack: 42,  defense: 18, speed: 12, exp: 95,  coins: { min: 35,  max: 65  } },
  4: { hp: 325, attack: 65,  defense: 27, speed: 13, exp: 155, coins: { min: 60,  max: 110 } },
  5: { hp: 460, attack: 95,  defense: 38, speed: 14, exp: 235, coins: { min: 100, max: 180 } },
  6: { hp: 635, attack: 142, defense: 53, speed: 15, exp: 350, coins: { min: 160, max: 280 } },
  7: { hp: 875, attack: 215, defense: 75, speed: 16, exp: 525, coins: { min: 250, max: 400 } },
}
// light/dark 속성 몬스터는 동일 구간 대비 20% 높은 스탯 (희귀 속성)
const SPECIAL_ATTR_MULT = 1.2

// 보스 배율
const BOSS_MULT = { hp: 3.0, attack: 2.0, defense: 1.5, speed: 1.0, exp: 5.0, coins: 8.0 }

// ── 속성별 이름 템플릿 [구간1~7: [이름A, 이름B, 보스이름]] ────────────
const MONSTER_TEMPLATES = {
  fire: [
    ['화염 슬라임',   '불씨 도마뱀',    '잿빛 군주'],       // tier1
    ['화염 게이저',   '마그마 도롱뇽',  '용암 수호자'],     // tier2
    ['불꽃 골렘',     '화염 수호자',    '용암 군주'],       // tier3
    ['화룡 전사',     '마그마 타이탄',  '화산 왕'],         // tier4
    ['광염 드레이크', '화산 군주',      '폭염의 지배자'],   // tier5
    ['아르카나 화룡', '불꽃 심연체',    '화신 아르카나'],   // tier6
    ['균열 화룡',     '화염 에레멘탈',  '불꽃의 신'],       // tier7
  ],
  water: [
    ['물 젤리',       '잔물결 정령',    '안개 지배자'],
    ['해파리 병사',   '조류 파수꾼',    '심해 전령'],
    ['물결 수호자',   '빙산 해룡',      '조류 지배자'],
    ['심해 전사',     '파도 타이탄',    '대해 왕'],
    ['망각의 심연체', '심해 군주',      '파도의 지배자'],
    ['아르카나 해룡', '수류 심연체',    '수신 아르카나'],
    ['균열 해룡',     '수류 에레멘탈',  '물의 신'],
  ],
  wind: [
    ['바람 정령',     '돌풍 새',        '회오리 군주'],
    ['폭풍 하피',     '기류 수호자',    '회오리 전령'],
    ['폭풍 독수리',   '기류 타이탄',    '바람 지배자'],
    ['사이클론 전사', '폭풍 군주',      '폭풍 왕'],
    ['태풍의 심연체', '회오리 군주',    '풍신의 지배자'],
    ['아르카나 폭풍', '풍류 심연체',    '풍신 아르카나'],
    ['균열 폭풍체',   '풍류 에레멘탈',  '바람의 신'],
  ],
  earth: [
    ['흙 골렘',       '돌 원숭이',      '거석 군주'],
    ['바위 갑각수',   '황토 타이탄',    '거석 전령'],
    ['대지 수호자',   '철벽 골렘',      '대지 지배자'],
    ['지각 전사',     '암반 타이탄',    '대지 왕'],
    ['세계 기둥체',   '대지 군주',      '지신의 지배자'],
    ['아르카나 대지룡', '지각 심연체',  '지신 아르카나'],
    ['균열 대지체',   '대지 에레멘탈',  '땅의 신'],
  ],
  thunder: [
    ['번개 쥐',       '전기 도마뱀',    '뇌운 군주'],
    ['전기 뱀',       '번개 매',        '뇌운 전령'],
    ['번개 타이탄',   '전기 수호자',    '뇌신의 군주'],
    ['번개 전사',     '뇌운 타이탄',    '번개 왕'],
    ['번개 왕좌체',   '뇌신 군주',      '뇌신의 지배자'],
    ['아르카나 뇌룡', '뇌신 심연체',    '뇌신 아르카나'],
    ['균열 뇌룡',     '번개 에레멘탈',  '번개의 신'],
  ],
  ice: [
    ['눈 토끼',       '서리 정령',      '빙하 군주'],
    ['얼음 곰',       '빙하 파수꾼',    '빙결 전령'],
    ['빙결 수호자',   '서리 타이탄',    '빙결 지배자'],
    ['빙하 전사',     '서리 군주',      '얼음 왕'],
    ['절대 빙원체',   '영구동토 군주',  '빙신의 지배자'],
    ['아르카나 빙룡', '빙결 심연체',    '빙신 아르카나'],
    ['균열 빙룡',     '얼음 에레멘탈',  '얼음의 신'],
  ],
  poison: [
    ['독 거미',       '독초 정령',      '독무 군주'],
    ['산성 개구리',   '독기 파수꾼',    '독기 전령'],
    ['독기 수호자',   '독무 타이탄',    '독무 지배자'],
    ['독룡 전사',     '독기 군주',      '독의 왕'],
    ['독의 신전체',   '독기 심연체',    '독신의 지배자'],
    ['아르카나 독룡', '독기 심연체',    '독신 아르카나'],
    ['균열 독룡',     '독기 에레멘탈',  '독의 신'],
  ],
  dragon: [
    ['드래곤 새끼',   '작은 비룡',      '드래곤 군주'],
    ['성체 비룡',     '용의 파수꾼',    '용의 전령'],
    ['드래곤 수호자', '고룡 타이탄',    '용의 지배자'],
    ['드래곤 전사',   '고룡 군주',      '드래곤 왕'],
    ['용의 왕좌체',   '드래곤 군주',    '용신의 지배자'],
    ['아르카나 고룡', '드래곤 심연체',  '용신 아르카나'],
    ['균열 고룡',     '용신 에레멘탈',  '드래곤의 신'],
  ],
  light: [
    ['빛의 새싹',     '성광 정령',      '성광 군주'],
    ['성소 파수꾼',   '광명 수호자',    '성소 전령'],
    ['성광 기사',     '광명 타이탄',    '성광 지배자'],
    ['성전사',        '광명 군주',      '빛의 왕'],
    ['빛의 왕국체',   '성광 심연',      '빛의 패왕'],
    ['아르카나 성룡', '광명 심연체',    '성룡 아르카나'],
    ['균열 성룡',     '빛 에레멘탈',    '빛의 신'],
  ],
  dark: [
    ['어둠의 싹',     '암흑 정령',      '암흑 군주'],
    ['폐허 파수꾼',   '어둠 수호자',    '폐허 전령'],
    ['암흑 기사',     '어둠 타이탄',    '암흑 지배자'],
    ['암흑 전사',     '어둠 군주',      '어둠의 왕'],
    ['어둠의 왕국체', '암흑 심연',      '어둠의 패왕'],
    ['아르카나 암룡', '암흑 심연체',    '암룡 아르카나'],
    ['균열 암룡',     '어둠 에레멘탈',  '어둠의 신'],
  ],
}

// ── MONSTERS 배열 생성 ────────────────────────────────────────────────
const ATTRIBUTES = ['fire','water','wind','earth','thunder','ice','poison','dragon','light','dark']

function scaleStats(base, mult, isBoss = false) {
  const m = isBoss ? BOSS_MULT : { hp: 1, attack: 1, defense: 1, speed: 1, exp: 1, coins: 1 }
  return {
    hp:       Math.round(base.hp      * mult * m.hp),
    attack:   Math.round(base.attack  * mult * m.attack),
    defense:  Math.round(base.defense * mult * m.defense),
    speed:    Math.round(base.speed   * m.speed),
    exp:      Math.round(base.exp     * mult * m.exp),
    coins:    { min: Math.round(base.coins.min * mult * m.coins), max: Math.round(base.coins.max * mult * m.coins) },
  }
}

const MONSTERS = []

for (const attr of ATTRIBUTES) {
  const isSpecial = attr === 'light' || attr === 'dark'
  const attrMult  = isSpecial ? SPECIAL_ATTR_MULT : 1.0
  const templates = MONSTER_TEMPLATES[attr]

  for (let tier = 1; tier <= 7; tier++) {
    const base = TIER_BASE[tier]
    const [nameA, nameB, bossName] = templates[tier - 1]

    MONSTERS.push({
      id:        `${attr}_${tier}_a`,
      name:      nameA,
      attribute: attr,
      tier,
      isBoss:    false,
      ...scaleStats(base, attrMult),
    })
    MONSTERS.push({
      id:        `${attr}_${tier}_b`,
      name:      nameB,
      attribute: attr,
      tier,
      isBoss:    false,
      ...scaleStats(base, attrMult * 1.05), // 두 번째 몬스터 5% 강함
    })
    MONSTERS.push({
      id:        `${attr}_${tier}_boss`,
      name:      bossName,
      attribute: attr,
      tier,
      isBoss:    true,
      ...scaleStats(base, attrMult, true),
    })
  }
}

// ── 히든 스테이지 에레멘탈 (수동 사냥 0.001% 진입, 구역 tier×2 스펙) ──
const HIDDEN_ELEMENTALS = [
  { attr: 'fire',    name: '화염 에레멘탈 히든' },
  { attr: 'water',   name: '수류 에레멘탈 히든' },
  { attr: 'wind',    name: '풍류 에레멘탈 히든' },
  { attr: 'earth',   name: '대지 에레멘탈 히든' },
  { attr: 'thunder', name: '뇌신 에레멘탈 히든' },
  { attr: 'ice',     name: '빙결 에레멘탈 히든' },
  { attr: 'poison',  name: '독기 에레멘탈 히든' },
  { attr: 'dragon',  name: '용신 에레멘탈 히든' },
  { attr: 'light',   name: '성광 에레멘탈 히든' },
  { attr: 'dark',    name: '암흑 에레멘탈 히든' },
]

// 히든 에레멘탈은 호출 시 zoneTier를 인자로 받아 동적 스탯 계산
// 아래는 tier7 기준 ×2 고정 스탯으로 정의 (최고 난이도)
for (const { attr, name } of HIDDEN_ELEMENTALS) {
  const base7 = TIER_BASE[7]
  const isSpecial = attr === 'light' || attr === 'dark'
  const mult = (isSpecial ? SPECIAL_ATTR_MULT : 1.0) * 2.0
  MONSTERS.push({
    id:        `${attr}_hidden`,
    name,
    attribute: attr,
    tier:      8, // 히든 전용 티어
    isBoss:    false,
    isHidden:  true,
    ...scaleStats(base7, mult),
    drops: [{ itemId: 'evo_stone', rate: 1.0, quantity: 1 }], // evo_stone 확정 드롭
  })
}


// ══════════════════════════════════════════════════════════════════════
// 구역 (ZONES) — 70개 + 히든 스테이지 10개
// ══════════════════════════════════════════════════════════════════════

const ZONE_META = {
  fire:    {
    1: { name: '잿빛 언덕',         desc: '불씨가 남은 평원' },
    2: { name: '화염 동굴 입구',     desc: '용암 흐르는 동굴 초입' },
    3: { name: '용암 지대',         desc: '활화산 용암 지형' },
    4: { name: '화산 내부',         desc: '화산 심부 용암 동굴' },
    5: { name: '불의 성역',         desc: '화염 에레멘탈 성지' },
    6: { name: '아르카나 화염 계',   desc: '아르카나 심부 화염 공간' },
    7: { name: '균열 화염부',        desc: '아르카 영향권 화염 균열' },
  },
  water:   {
    1: { name: '안개 늪지',         desc: '짙은 안개와 얕은 물웅덩이' },
    2: { name: '폭포 분지',         desc: '거대 폭포 아래 분지' },
    3: { name: '심해 입구',         desc: '빛이 닿지 않는 심해 초입' },
    4: { name: '심해',              desc: '압도적인 수압의 깊은 바다' },
    5: { name: '망각의 해저',        desc: '의식을 잃게 하는 해저 지형' },
    6: { name: '아르카나 수류 계',   desc: '아르카나 심부 수류 공간' },
    7: { name: '균열 수류부',        desc: '아르카 영향권 수류 균열' },
  },
  wind:    {
    1: { name: '바람의 평원',        desc: '끊임없이 바람이 부는 초원' },
    2: { name: '폭풍 협곡',         desc: '바람이 수렴하는 좁은 협곡' },
    3: { name: '회오리 숲',         desc: '항상 회오리가 치는 숲' },
    4: { name: '사이클론 핵',        desc: '태풍의 중심부' },
    5: { name: '폭풍의 눈',         desc: '고요하지만 위험한 태풍 눈' },
    6: { name: '아르카나 풍류 계',   desc: '아르카나 심부 풍류 공간' },
    7: { name: '균열 풍류부',        desc: '아르카 영향권 풍류 균열' },
  },
  earth:   {
    1: { name: '갈색 황야',         desc: '척박한 흙 지형과 낮은 바위' },
    2: { name: '거석 평원',         desc: '거대한 바위가 늘어선 평원' },
    3: { name: '대지의 심장',        desc: '지각 에너지가 집중된 지점' },
    4: { name: '지각 심부',         desc: '지구 내부 암석 지대' },
    5: { name: '세계의 기둥',        desc: '아르카나를 지지하는 기둥' },
    6: { name: '아르카나 대지 계',   desc: '아르카나 심부 대지 공간' },
    7: { name: '균열 대지부',        desc: '아르카 영향권 대지 균열' },
  },
  thunder: {
    1: { name: '번개 초원',         desc: '맑아도 번개가 치는 들판' },
    2: { name: '뇌운 고원',         desc: '항상 먹구름이 낀 고원' },
    3: { name: '번개 탑',           desc: '번개를 끌어당기는 탑 지대' },
    4: { name: '뇌신의 전당',        desc: '번개가 집중되는 성지' },
    5: { name: '번개 왕좌',         desc: '뇌신이 좌정한 왕좌' },
    6: { name: '아르카나 뇌신 계',   desc: '아르카나 심부 뇌신 공간' },
    7: { name: '균열 뇌신부',        desc: '아르카 영향권 뇌신 균열' },
  },
  ice:     {
    1: { name: '서리 숲',           desc: '사계절 얼어붙은 작은 숲' },
    2: { name: '빙하 계곡',         desc: '천년 빙하가 흐르는 계곡' },
    3: { name: '영구 동토',         desc: '절대 녹지 않는 동토 지대' },
    4: { name: '절대 빙원',         desc: '완전 동결 빙하 지대' },
    5: { name: '빙하 왕국',         desc: '거대 빙하로 이뤄진 왕국' },
    6: { name: '아르카나 빙결 계',   desc: '아르카나 심부 빙결 공간' },
    7: { name: '균열 빙결부',        desc: '아르카 영향권 빙결 균열' },
  },
  poison:  {
    1: { name: '독초 들판',         desc: '독성 식물이 자라는 황폐한 들' },
    2: { name: '독기 늪',           desc: '독기가 차오른 늪지대' },
    3: { name: '독의 심연',         desc: '독기가 응축된 심층부' },
    4: { name: '독룡의 소굴',        desc: '독룡이 서식하는 동굴' },
    5: { name: '독의 신전',         desc: '독기 에레멘탈 성지' },
    6: { name: '아르카나 독기 계',   desc: '아르카나 심부 독기 공간' },
    7: { name: '균열 독기부',        desc: '아르카 영향권 독기 균열' },
  },
  dragon:  {
    1: { name: '알의 계곡',         desc: '드래곤 알이 방치된 협곡' },
    2: { name: '용의 길목',         desc: '드래곤 이동 경로' },
    3: { name: '드래곤 둥지',        desc: '드래곤 서식 핵심 지대' },
    4: { name: '드래곤 왕국',        desc: '드래곤이 지배하는 고대 왕국' },
    5: { name: '드래곤 왕좌',        desc: '드래곤 왕이 좌정한 곳' },
    6: { name: '아르카나 용신 계',   desc: '아르카나 심부 용신 공간' },
    7: { name: '균열 용신부',        desc: '아르카 영향권 용신 균열' },
  },
  light:   {
    1: { name: '빛의 입구',         desc: '균열 근처 이상하게 밝은 지대', unlock: 'zone_access' },
    2: { name: '성소 외곽',         desc: 'Luxis 성소 근처 (luxis_rep 30+ 접근)', unlock: 'luxis_30' },
    3: { name: 'Luxis 성소',        desc: 'Luxis 성소 내부 (luxis_rep 50+)',       unlock: 'luxis_50' },
    4: { name: 'Luxis 신전',        desc: 'Luxis 신전 (luxis_rep 70+)',             unlock: 'luxis_70' },
    5: { name: '빛의 왕국',         desc: '빛의 에레멘탈 성지 (luxis_rep 90+)',    unlock: 'luxis_90' },
    6: { name: '아르카나 광원 계',   desc: '아르카나 심부 광원 공간',               unlock: 'story_ch5' },
    7: { name: '균열 광원부',        desc: '아르카 영향권 광원 균열',               unlock: 'story_ch5' },
  },
  dark:    {
    1: { name: '어둠의 입구',        desc: '균열 근처 이상하게 어두운 지대', unlock: 'zone_access' },
    2: { name: '폐허 외곽',         desc: 'Noctis 폐허 근처 (noctis_rep 30+)',     unlock: 'noctis_30' },
    3: { name: 'Noctis 폐허',        desc: 'Noctis 폐허 내부 (noctis_rep 50+)',     unlock: 'noctis_50' },
    4: { name: 'Noctis 암흑성',      desc: 'Noctis 암흑 성채 (noctis_rep 70+)',     unlock: 'noctis_70' },
    5: { name: '어둠의 왕국',        desc: '어둠의 에레멘탈 성지 (noctis_rep 90+)', unlock: 'noctis_90' },
    6: { name: '아르카나 심연 계',   desc: '아르카나 심부 심연 공간',               unlock: 'story_ch5' },
    7: { name: '균열 심연부',        desc: '아르카 영향권 심연 균열',               unlock: 'story_ch5' },
  },
}

const TIER_LEVEL_RANGE = {
  1: { min: 1,  max: 10 },
  2: { min: 11, max: 20 },
  3: { min: 21, max: 30 },
  4: { min: 31, max: 40 },
  5: { min: 41, max: 50 },
  6: { min: 51, max: 60 },
  7: { min: 61, max: 70 },
}

const ZONES = []

for (const attr of ATTRIBUTES) {
  for (let tier = 1; tier <= 7; tier++) {
    const meta  = ZONE_META[attr][tier]
    const range = TIER_LEVEL_RANGE[tier]
    ZONES.push({
      id:         `zone_${tier}_${attr}`,
      name:       meta.name,
      description: meta.desc,
      attribute:  attr,
      tier,
      minLevel:   range.min,
      maxLevel:   range.max,
      monsterIds: [`${attr}_${tier}_a`, `${attr}_${tier}_b`],
      bossId:     `${attr}_${tier}_boss`,
      hiddenMonsterId: `${attr}_hidden`,
      unlock:     meta.unlock || null,
    })
  }
}

// ── 드롭 테이블 (tier별 공통) ─────────────────────────────────────────
// rate는 자동 사냥 기준; 수동 사냥 시 HuntingSystem에서 +20% 적용
const DROP_TABLES = {
  1: [
    { itemId: 'pet_food',  rate: 0.25, quantity: 1 },
    { itemId: 'happy_toy', rate: 0.10, quantity: 1 },
  ],
  2: [
    { itemId: 'pet_food',  rate: 0.22, quantity: 1 },
    { itemId: 'pet_soap',  rate: 0.12, quantity: 1 },
    { itemId: 'happy_toy', rate: 0.08, quantity: 1 },
  ],
  3: [
    { itemId: 'pet_food',   rate: 0.20, quantity: 1 },
    { itemId: 'pet_soap',   rate: 0.12, quantity: 1 },
    { itemId: 'life_charm', rate: 0.06, quantity: 1 },
    { itemId: 'happy_toy',  rate: 0.06, quantity: 1 },
  ],
  4: [
    { itemId: 'pet_food',      rate: 0.18, quantity: 1 },
    { itemId: 'pet_soap',      rate: 0.10, quantity: 1 },
    { itemId: 'life_charm',    rate: 0.08, quantity: 1 },
    { itemId: 'energy_potion', rate: 0.05, quantity: 1 },
  ],
  5: [
    { itemId: 'pet_food',      rate: 0.18, quantity: 1 },
    { itemId: 'pet_soap',      rate: 0.10, quantity: 1 },
    { itemId: 'life_charm',    rate: 0.08, quantity: 1 },
    { itemId: 'energy_potion', rate: 0.07, quantity: 1 },
    { itemId: 'revive_stone',  rate: 0.03, quantity: 1 },
  ],
  6: [
    { itemId: 'pet_food',      rate: 0.18, quantity: 1 },
    { itemId: 'life_charm',    rate: 0.10, quantity: 1 },
    { itemId: 'energy_potion', rate: 0.08, quantity: 1 },
    { itemId: 'revive_stone',  rate: 0.05, quantity: 1 },
    { itemId: 'evo_stone',     rate: 0.02, quantity: 1 },
  ],
  7: [
    { itemId: 'pet_food',      rate: 0.18, quantity: 1 },
    { itemId: 'life_charm',    rate: 0.10, quantity: 1 },
    { itemId: 'energy_potion', rate: 0.10, quantity: 1 },
    { itemId: 'revive_stone',  rate: 0.07, quantity: 1 },
    { itemId: 'evo_stone',     rate: 0.05, quantity: 1 },
  ],
}

// ── 헬퍼 함수 ─────────────────────────────────────────────────────────
function getMonster(id) {
  return MONSTERS.find(m => m.id === id) || null
}

function getZone(id) {
  return ZONES.find(z => z.id === id) || null
}

function getDropTable(monsterId) {
  const monster = MONSTERS.find(m => m.id === monsterId)
  if (!monster) return []
  if (monster.drops) return monster.drops          // 히든 에레멘탈 개별 드롭
  return DROP_TABLES[monster.tier] || []
}

module.exports = { MONSTERS, ZONES, DROP_TABLES, getMonster, getZone, getDropTable }
