const ATTRS = ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon']

// AFFINITY[attacker][defender] = 상성배율 (1.3 유리 / 1.0 중립 / 0.77 불리)
const AFFINITY = {
  fire:    { fire: 1.0,  water: 0.77, wind: 1.3,  earth: 0.77, thunder: 1.3,  ice: 0.77, poison: 1.3,  dragon: 0.77 },
  water:   { fire: 1.3,  water: 1.0,  wind: 0.77, earth: 1.3,  thunder: 0.77, ice: 1.0,  poison: 1.0,  dragon: 1.0  },
  wind:    { fire: 0.77, water: 1.3,  wind: 1.0,  earth: 0.77, thunder: 0.77, ice: 1.3,  poison: 1.3,  dragon: 0.77 },
  earth:   { fire: 1.3,  water: 0.77, wind: 1.3,  earth: 1.0,  thunder: 1.3,  ice: 0.77, poison: 0.77, dragon: 1.0  },
  thunder: { fire: 0.77, water: 1.3,  wind: 1.3,  earth: 0.77, thunder: 1.0,  ice: 1.3,  poison: 0.77, dragon: 1.0  },
  ice:     { fire: 1.3,  water: 1.0,  wind: 0.77, earth: 1.3,  thunder: 0.77, ice: 1.0,  poison: 1.3,  dragon: 1.3  },
  poison:  { fire: 0.77, water: 1.0,  wind: 0.77, earth: 1.3,  thunder: 1.3,  ice: 0.77, poison: 1.0,  dragon: 1.3  },
  dragon:  { fire: 1.3,  water: 1.0,  wind: 1.3,  earth: 1.0,  thunder: 1.0,  ice: 0.77, poison: 0.77, dragon: 1.0  },
}

function getMultiplier(attackerAttr, defenderAttr) {
  const row = AFFINITY[attackerAttr]
  if (!row) return 1.0
  return row[defenderAttr] ?? 1.0
}

function isFavorable(attackerAttr, defenderAttr) {
  return getMultiplier(attackerAttr, defenderAttr) === 1.3
}

module.exports = { ATTRS, AFFINITY, getMultiplier, isFavorable }
