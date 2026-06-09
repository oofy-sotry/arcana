// 교배 호환성 등급: S=같은속성(💖) C=호환(❤️) N=중립(💛) I=불호환(💔)
const COMPAT = {
  fire:    { fire:'S', water:'I', wind:'C',  earth:'N',  thunder:'C',  ice:'I', poison:'N',  dragon:'C', light:'N',  dark:'I' },
  water:   { fire:'I', water:'S', wind:'C',  earth:'C',  thunder:'I',  ice:'C', poison:'I',  dragon:'C', light:'N',  dark:'N' },
  wind:    { fire:'C', water:'C', wind:'S',  earth:'I',  thunder:'C',  ice:'N', poison:'I',  dragon:'C', light:'N',  dark:'N' },
  earth:   { fire:'N', water:'C', wind:'I',  earth:'S',  thunder:'I',  ice:'C', poison:'C',  dragon:'N', light:'N',  dark:'N' },
  thunder: { fire:'C', water:'I', wind:'C',  earth:'I',  thunder:'S',  ice:'I', poison:'N',  dragon:'C', light:'N',  dark:'N' },
  ice:     { fire:'I', water:'C', wind:'N',  earth:'C',  thunder:'I',  ice:'S', poison:'N',  dragon:'I', light:'C',  dark:'C' },
  poison:  { fire:'N', water:'I', wind:'I',  earth:'C',  thunder:'N',  ice:'N', poison:'S',  dragon:'I', light:'I',  dark:'C' },
  dragon:  { fire:'C', water:'C', wind:'C',  earth:'N',  thunder:'C',  ice:'I', poison:'I',  dragon:'S', light:'C',  dark:'I' },
  light:   { fire:'N', water:'N', wind:'N',  earth:'N',  thunder:'N',  ice:'C', poison:'I',  dragon:'C', light:'S',  dark:'I' },
  dark:    { fire:'I', water:'N', wind:'N',  earth:'N',  thunder:'N',  ice:'C', poison:'C',  dragon:'I', light:'I',  dark:'S' },
}

// 불호환(I) 교배 성공 시 탄생하는 혼합속성
// key = [attr1, attr2].sort().join('+')
const HYBRID_RESULTS = {
  'fire+water':    { species: 'Steamar',    name: '증기',     attribute: 'fire',    attribute2: 'water'   },
  'fire+ice':      { species: 'Magmaron',   name: '마그마',   attribute: 'fire',    attribute2: 'ice'     },
  'dark+fire':     { species: 'Helflaron',  name: '지옥화',   attribute: 'dark',    attribute2: 'fire'    },
  'thunder+water': { species: 'Stormtidex', name: '폭풍해',   attribute: 'thunder', attribute2: 'water'   },
  'poison+water':  { species: 'Acidrax',    name: '산성',     attribute: 'poison',  attribute2: 'water'   },
  'earth+wind':    { species: 'Sandorrex',  name: '사막폭풍', attribute: 'earth',   attribute2: 'wind'    },
  'poison+wind':   { species: 'Venomstrix', name: '독풍',     attribute: 'poison',  attribute2: 'wind'    },
  'earth+thunder': { species: 'Metalrox',   name: '금속',     attribute: 'earth',   attribute2: 'thunder' },
  'ice+thunder':   { species: 'Frostoltex', name: '극한폭풍', attribute: 'ice',     attribute2: 'thunder' },
  'dragon+ice':    { species: 'Glacidrax',  name: '빙결룡',   attribute: 'dragon',  attribute2: 'ice'     },
  'light+poison':  { species: 'Sacrotox',   name: '신성독',   attribute: 'light',   attribute2: 'poison'  },
  'dragon+poison': { species: 'Venomrex',   name: '독룡',     attribute: 'dragon',  attribute2: 'poison'  },
  'dark+dragon':   { species: 'Shadowrex',  name: '암흑룡',   attribute: 'dark',    attribute2: 'dragon'  },
  'dark+light':    { species: 'Chaosrex',   name: '카오스',   attribute: 'dark',    attribute2: 'light'   },
}

// 호환 등급별 자식 속성 결정 확률
const COMPAT_PROBS = {
  S: { hybridChance: 0.00, inheritChance: 0.90 },
  C: { hybridChance: 0.00, inheritChance: 0.85 },
  N: { hybridChance: 0.00, inheritChance: 0.75 },
  I: { hybridChance: 0.03, inheritChance: 0.97 }, // 불호환: 3% 혼합, 97%는 부모 속성 중 하나
}

// 몰빵 보정: batchCount만큼 교배 횟수 소진 시 hybridChance 상승 (최대 30%)
const HYBRID_BATCH_CAP = 0.30

function getCompatKey(attr1, attr2) {
  return [attr1, attr2].sort().join('+')
}

function getCompat(attr1, attr2) {
  return COMPAT[attr1]?.[attr2] ?? 'N'
}

function getHybridResult(attr1, attr2) {
  return HYBRID_RESULTS[getCompatKey(attr1, attr2)] ?? null
}

function calcHybridChance(attr1, attr2, batchCount = 1) {
  const compat = getCompat(attr1, attr2)
  if (compat !== 'I') return 0
  return Math.min(COMPAT_PROBS.I.hybridChance * batchCount, HYBRID_BATCH_CAP)
}

module.exports = {
  COMPAT,
  HYBRID_RESULTS,
  COMPAT_PROBS,
  getCompatKey,
  getCompat,
  getHybridResult,
  calcHybridChance,
}
