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

// T2 혼합종: T1×T1 교배 성공 시 (3% 확률) 탄생
// key = [species1, species2].map(s => s.toLowerCase()).sort().join('×')
// Dominant T2: 부모 속성 중 하나가 겹침 → 해당 속성이 dominant (3속성)
// Balanced T2: 부모 4속성 전부 다름 → 균형 4속성 (옴니렉스 탄생 가능 풀)
const HYBRID_TIER2_RESULTS = {
  // ── Fire Dominant (3) ──
  'magmaron×steamar':     { species: 'Pyroflux',     name: '화염류',     isDominant: true,  dominantAttr: 'fire',    attributes: ['fire', 'water', 'ice']             },
  'helflaron×steamar':    { species: 'Helflux',      name: '지옥화류',   isDominant: true,  dominantAttr: 'fire',    attributes: ['dark', 'fire', 'water']            },
  'helflaron×magmaron':   { species: 'Pyroabyss',    name: '심연화염',   isDominant: true,  dominantAttr: 'fire',    attributes: ['dark', 'fire', 'ice']              },
  // ── Water Dominant (3) ──
  'steamar×stormtidex':   { species: 'Aquastorm',    name: '수류폭풍',   isDominant: true,  dominantAttr: 'water',   attributes: ['fire', 'thunder', 'water']         },
  'acidrax×steamar':      { species: 'Aquaflare',    name: '수류화염',   isDominant: true,  dominantAttr: 'water',   attributes: ['fire', 'poison', 'water']          },
  'acidrax×stormtidex':   { species: 'Aquatox',      name: '수류독',     isDominant: true,  dominantAttr: 'water',   attributes: ['poison', 'thunder', 'water']       },
  // ── Thunder Dominant (3) ──
  'metalrox×stormtidex':  { species: 'Volterra',     name: '번개대지',   isDominant: true,  dominantAttr: 'thunder', attributes: ['earth', 'thunder', 'water']        },
  'frostoltex×stormtidex':{ species: 'Volttide',     name: '번개조류',   isDominant: true,  dominantAttr: 'thunder', attributes: ['ice', 'thunder', 'water']          },
  'frostoltex×metalrox':  { species: 'Geovoltrex',   name: '지구번개',   isDominant: true,  dominantAttr: 'thunder', attributes: ['earth', 'ice', 'thunder']          },
  // ── Ice Dominant (3) ──
  'frostoltex×magmaron':  { species: 'Cryoflare',    name: '빙결화염',   isDominant: true,  dominantAttr: 'ice',     attributes: ['fire', 'ice', 'thunder']           },
  'glacidrax×magmaron':   { species: 'Cryodrakon',   name: '빙결룡화',   isDominant: true,  dominantAttr: 'ice',     attributes: ['dragon', 'fire', 'ice']            },
  'frostoltex×glacidrax': { species: 'Cryovoltex',   name: '빙결번개룡', isDominant: true,  dominantAttr: 'ice',     attributes: ['dragon', 'ice', 'thunder']         },
  // ── Earth Dominant (1) ──
  'metalrox×sandorrex':   { species: 'Terravolt',    name: '대지번개',   isDominant: true,  dominantAttr: 'earth',   attributes: ['earth', 'thunder', 'wind']         },
  // ── Wind Dominant (1) ──
  'sandorrex×venomstrix': { species: 'Stormvenom',   name: '독폭풍',     isDominant: true,  dominantAttr: 'wind',    attributes: ['earth', 'poison', 'wind']          },
  // ── Poison Dominant (6) ──
  'acidrax×venomstrix':   { species: 'Venomtide',    name: '독조류',     isDominant: true,  dominantAttr: 'poison',  attributes: ['poison', 'water', 'wind']          },
  'acidrax×sacrotox':     { species: 'Sacrovenom',   name: '신성독류',   isDominant: true,  dominantAttr: 'poison',  attributes: ['light', 'poison', 'water']         },
  'acidrax×venomrex':     { species: 'Venenorex',    name: '독용류',     isDominant: true,  dominantAttr: 'poison',  attributes: ['dragon', 'poison', 'water']        },
  'sacrotox×venomstrix':  { species: 'Luminotox',    name: '발광독',     isDominant: true,  dominantAttr: 'poison',  attributes: ['light', 'poison', 'wind']          },
  'venomrex×venomstrix':  { species: 'Venomdragon',  name: '독비룡',     isDominant: true,  dominantAttr: 'poison',  attributes: ['dragon', 'poison', 'wind']         },
  'sacrotox×venomrex':    { species: 'Sacrodrax',    name: '신성독룡',   isDominant: true,  dominantAttr: 'poison',  attributes: ['dragon', 'light', 'poison']        },
  // ── Dragon Dominant (3) ──
  'glacidrax×venomrex':   { species: 'Glacivenom',   name: '빙결독룡',   isDominant: true,  dominantAttr: 'dragon',  attributes: ['dragon', 'ice', 'poison']          },
  'glacidrax×shadowrex':  { species: 'Shadiglaci',   name: '암흑빙결룡', isDominant: true,  dominantAttr: 'dragon',  attributes: ['dark', 'dragon', 'ice']            },
  'shadowrex×venomrex':   { species: 'Shadowvenom',  name: '암흑독룡',   isDominant: true,  dominantAttr: 'dragon',  attributes: ['dark', 'dragon', 'poison']         },
  // ── Dark Dominant (3) ──
  'helflaron×shadowrex':  { species: 'Infernoshade', name: '지옥암흑룡', isDominant: true,  dominantAttr: 'dark',    attributes: ['dark', 'dragon', 'fire']           },
  'chaosrex×helflaron':   { species: 'Helchaos',     name: '지옥카오스', isDominant: true,  dominantAttr: 'dark',    attributes: ['dark', 'fire', 'light']            },
  'chaosrex×shadowrex':   { species: 'Dracoshadow',  name: '카오스암흑룡',isDominant: true,  dominantAttr: 'dark',    attributes: ['dark', 'dragon', 'light']          },
  // ── Light Dominant (1) ──
  'chaosrex×sacrotox':    { species: 'Lumichaos',    name: '빛카오스',   isDominant: true,  dominantAttr: 'light',   attributes: ['dark', 'light', 'poison']          },

  // ── Balanced T2 — Steamar base (9) ──
  'sandorrex×steamar':    { species: 'Terrastimm',   name: '대지증기',   isDominant: false, attributes: ['fire', 'water', 'earth', 'wind']           },
  'steamar×venomstrix':   { species: 'Venosteam',    name: '독증기',     isDominant: false, attributes: ['fire', 'water', 'poison', 'wind']          },
  'metalrox×steamar':     { species: 'Metallsteam',  name: '금속증기',   isDominant: false, attributes: ['fire', 'water', 'earth', 'thunder']        },
  'frostoltex×steamar':   { species: 'Thermofrost',  name: '열빙',       isDominant: false, attributes: ['fire', 'water', 'ice', 'thunder']          },
  'glacidrax×steamar':    { species: 'Glaciflame',   name: '빙룡화염',   isDominant: false, attributes: ['fire', 'water', 'dragon', 'ice']           },
  'sacrotox×steamar':     { species: 'Sacrosteam',   name: '신성증기',   isDominant: false, attributes: ['fire', 'water', 'light', 'poison']         },
  'steamar×venomrex':     { species: 'Venoflame',    name: '독화염류',   isDominant: false, attributes: ['fire', 'water', 'dragon', 'poison']        },
  'shadowrex×steamar':    { species: 'Shadowsteam',  name: '암흑증기',   isDominant: false, attributes: ['fire', 'water', 'dark', 'dragon']          },
  'chaosrex×steamar':     { species: 'Chaosflame',   name: '카오스화염', isDominant: false, attributes: ['fire', 'water', 'dark', 'light']           },
  // ── Balanced T2 — Magmaron base (9) ──
  'magmaron×stormtidex':  { species: 'Magstorm',     name: '마그마폭풍', isDominant: false, attributes: ['fire', 'ice', 'thunder', 'water']          },
  'acidrax×magmaron':     { species: 'Acidmaron',    name: '산성마그마', isDominant: false, attributes: ['fire', 'ice', 'poison', 'water']           },
  'magmaron×sandorrex':   { species: 'Magmasand',    name: '마그마사막', isDominant: false, attributes: ['fire', 'ice', 'earth', 'wind']             },
  'magmaron×venomstrix':  { species: 'Venomfrost',   name: '독빙결',     isDominant: false, attributes: ['fire', 'ice', 'poison', 'wind']            },
  'magmaron×metalrox':    { species: 'Geomaron',     name: '지구마그마', isDominant: false, attributes: ['fire', 'ice', 'earth', 'thunder']          },
  'magmaron×sacrotox':    { species: 'Lumifrost',    name: '빛빙결',     isDominant: false, attributes: ['fire', 'ice', 'light', 'poison']           },
  'magmaron×venomrex':    { species: 'Pyrodrax',     name: '화염독룡',   isDominant: false, attributes: ['fire', 'ice', 'dragon', 'poison']          },
  'magmaron×shadowrex':   { species: 'Shadowaron',   name: '암흑마그마', isDominant: false, attributes: ['fire', 'ice', 'dark', 'dragon']            },
  'chaosrex×magmaron':    { species: 'Chaosabyss',   name: '카오스심연', isDominant: false, attributes: ['fire', 'ice', 'dark', 'light']             },
  // ── Balanced T2 — Helflaron base (9) ──
  'helflaron×stormtidex': { species: 'Hellstorm',    name: '지옥폭풍',   isDominant: false, attributes: ['dark', 'fire', 'thunder', 'water']         },
  'acidrax×helflaron':    { species: 'Hellacid',     name: '지옥산성',   isDominant: false, attributes: ['dark', 'fire', 'poison', 'water']          },
  'helflaron×sandorrex':  { species: 'Hellsand',     name: '지옥사막',   isDominant: false, attributes: ['dark', 'fire', 'earth', 'wind']            },
  'helflaron×venomstrix': { species: 'Hellvenom',    name: '지옥독',     isDominant: false, attributes: ['dark', 'fire', 'poison', 'wind']           },
  'helflaron×metalrox':   { species: 'Hellmetal',    name: '지옥금속',   isDominant: false, attributes: ['dark', 'fire', 'earth', 'thunder']         },
  'frostoltex×helflaron': { species: 'Hellfrost',    name: '지옥빙결',   isDominant: false, attributes: ['dark', 'fire', 'ice', 'thunder']           },
  'glacidrax×helflaron':  { species: 'Helldragon',   name: '지옥룡',     isDominant: false, attributes: ['dark', 'fire', 'dragon', 'ice']            },
  'helflaron×sacrotox':   { species: 'Hellsacro',    name: '지옥신성',   isDominant: false, attributes: ['dark', 'fire', 'light', 'poison']          },
  'helflaron×venomrex':   { species: 'Hellvennox',   name: '지옥독룡',   isDominant: false, attributes: ['dark', 'fire', 'dragon', 'poison']         },
  // ── Balanced T2 — Stormtidex base (7) ──
  'sandorrex×stormtidex': { species: 'Stormland',    name: '폭풍대지',   isDominant: false, attributes: ['thunder', 'water', 'earth', 'wind']        },
  'stormtidex×venomstrix':{ species: 'Toxstorm',     name: '독폭풍해',   isDominant: false, attributes: ['thunder', 'water', 'poison', 'wind']       },
  'glacidrax×stormtidex': { species: 'Stormdrakon',  name: '폭풍해룡',   isDominant: false, attributes: ['thunder', 'water', 'dragon', 'ice']        },
  'sacrotox×stormtidex':  { species: 'Sacrostorm',   name: '신성폭풍',   isDominant: false, attributes: ['thunder', 'water', 'light', 'poison']      },
  'stormtidex×venomrex':  { species: 'Venomstorm',   name: '독폭풍',     isDominant: false, attributes: ['thunder', 'water', 'dragon', 'poison']     },
  'shadowrex×stormtidex': { species: 'Shadowstorm',  name: '암흑폭풍',   isDominant: false, attributes: ['thunder', 'water', 'dark', 'dragon']       },
  'chaosrex×stormtidex':  { species: 'Chaosstorm',   name: '카오스폭풍', isDominant: false, attributes: ['thunder', 'water', 'dark', 'light']        },
  // ── Balanced T2 — Acidrax base (6) ──
  'acidrax×sandorrex':    { species: 'Acidland',     name: '산성대지',   isDominant: false, attributes: ['poison', 'water', 'earth', 'wind']         },
  'acidrax×metalrox':     { species: 'Acidmetal',    name: '산성금속',   isDominant: false, attributes: ['poison', 'water', 'earth', 'thunder']      },
  'acidrax×frostoltex':   { species: 'Acidfrost',    name: '산성빙결',   isDominant: false, attributes: ['poison', 'water', 'ice', 'thunder']        },
  'acidrax×glacidrax':    { species: 'Aciddrax',     name: '산성빙결룡', isDominant: false, attributes: ['poison', 'water', 'dragon', 'ice']         },
  'acidrax×shadowrex':    { species: 'Acidshade',    name: '산성암흑',   isDominant: false, attributes: ['poison', 'water', 'dark', 'dragon']        },
  'acidrax×chaosrex':     { species: 'Acidchaos',    name: '산성카오스', isDominant: false, attributes: ['poison', 'water', 'dark', 'light']         },
  // ── Balanced T2 — Sandorrex base (6) ──
  'frostoltex×sandorrex': { species: 'Frostland',    name: '빙결대지',   isDominant: false, attributes: ['earth', 'wind', 'ice', 'thunder']          },
  'glacidrax×sandorrex':  { species: 'Sanddrax',     name: '사막빙결룡', isDominant: false, attributes: ['earth', 'wind', 'dragon', 'ice']           },
  'sacrotox×sandorrex':   { species: 'Sandlux',      name: '사막신성',   isDominant: false, attributes: ['earth', 'wind', 'light', 'poison']         },
  'sandorrex×venomrex':   { species: 'Sandvenom',    name: '사막독룡',   isDominant: false, attributes: ['earth', 'wind', 'dragon', 'poison']        },
  'sandorrex×shadowrex':  { species: 'Sandshade',    name: '사막암흑',   isDominant: false, attributes: ['earth', 'wind', 'dark', 'dragon']          },
  'chaosrex×sandorrex':   { species: 'Sandchaos',    name: '사막카오스', isDominant: false, attributes: ['earth', 'wind', 'dark', 'light']           },
  // ── Balanced T2 — Venomstrix base (5) ──
  'metalrox×venomstrix':  { species: 'Venometal',    name: '독금속',     isDominant: false, attributes: ['poison', 'wind', 'earth', 'thunder']       },
  'frostoltex×venomstrix':{ species: 'Venomfrostex', name: '독빙결폭풍', isDominant: false, attributes: ['poison', 'wind', 'ice', 'thunder']         },
  'glacidrax×venomstrix': { species: 'Venomdraxon',  name: '독빙결룡',   isDominant: false, attributes: ['poison', 'wind', 'dragon', 'ice']          },
  'shadowrex×venomstrix': { species: 'Venomshade',   name: '독암흑',     isDominant: false, attributes: ['poison', 'wind', 'dark', 'dragon']         },
  'chaosrex×venomstrix':  { species: 'Venomchaos',   name: '독카오스',   isDominant: false, attributes: ['poison', 'wind', 'dark', 'light']          },
  // ── Balanced T2 — Metalrox base (5) ──
  'glacidrax×metalrox':   { species: 'Glacimetal',   name: '빙결금속',   isDominant: false, attributes: ['earth', 'thunder', 'dragon', 'ice']        },
  'metalrox×sacrotox':    { species: 'Metalsacro',   name: '금속신성',   isDominant: false, attributes: ['earth', 'thunder', 'light', 'poison']      },
  'metalrox×venomrex':    { species: 'Metalvennox',  name: '금속독룡',   isDominant: false, attributes: ['earth', 'thunder', 'dragon', 'poison']     },
  'metalrox×shadowrex':   { species: 'Metashade',    name: '금속암흑',   isDominant: false, attributes: ['earth', 'thunder', 'dark', 'dragon']       },
  'chaosrex×metalrox':    { species: 'Metalchaos',   name: '금속카오스', isDominant: false, attributes: ['earth', 'thunder', 'dark', 'light']        },
  // ── Balanced T2 — Frostoltex base (4) ──
  'frostoltex×sacrotox':  { species: 'Frostsacro',   name: '빙결신성',   isDominant: false, attributes: ['ice', 'thunder', 'light', 'poison']        },
  'frostoltex×venomrex':  { species: 'Frostvennox',  name: '빙결독룡',   isDominant: false, attributes: ['ice', 'thunder', 'dragon', 'poison']       },
  'frostoltex×shadowrex': { species: 'Frostshade',   name: '빙결암흑',   isDominant: false, attributes: ['ice', 'thunder', 'dark', 'dragon']         },
  'chaosrex×frostoltex':  { species: 'Frostchaos',   name: '빙결카오스', isDominant: false, attributes: ['ice', 'thunder', 'dark', 'light']          },
  // ── Balanced T2 — Glacidrax base (2) ──
  'glacidrax×sacrotox':   { species: 'Glacisacro',   name: '빙결신성룡', isDominant: false, attributes: ['dragon', 'ice', 'light', 'poison']         },
  'chaosrex×glacidrax':   { species: 'Glacichaos',   name: '빙결카오스룡',isDominant: false, attributes: ['dragon', 'ice', 'dark', 'light']           },
  // ── Balanced T2 — remaining (2) ──
  'sacrotox×shadowrex':   { species: 'Sacroshadow',  name: '신성암흑',   isDominant: false, attributes: ['light', 'poison', 'dark', 'dragon']        },
  'chaosrex×venomrex':    { species: 'Venomchaosx',  name: '독카오스룡', isDominant: false, attributes: ['dragon', 'poison', 'dark', 'light']        },
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

function getHybridTier2Result(species1, species2) {
  const key = [species1.toLowerCase(), species2.toLowerCase()].sort().join('×')
  return HYBRID_TIER2_RESULTS[key] ?? null
}

function calcHybridChance(attr1, attr2, batchCount = 1) {
  const compat = getCompat(attr1, attr2)
  if (compat !== 'I') return 0
  return Math.min(COMPAT_PROBS.I.hybridChance * batchCount, HYBRID_BATCH_CAP)
}

module.exports = {
  COMPAT,
  HYBRID_RESULTS,
  HYBRID_TIER2_RESULTS,
  COMPAT_PROBS,
  getCompatKey,
  getCompat,
  getHybridResult,
  getHybridTier2Result,
  calcHybridChance,
}
