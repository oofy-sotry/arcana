const { getMultiplier, isFavorable } = require('../data/attributes')

const CRIT_BASE_RATE   = 0.10
const CRIT_BONUS_RATE  = 0.15 // 상성 유리 시 추가
const CRIT_MULTIPLIER  = 1.5
const SKILL_COEFF_BASE = 1.0
const SKILL_COEFF_STEP = 0.1 // 스킬 레벨당 증가량

// 크리티컬: 기본 10%, 상성 유리 시 +15% → 25% (CRIT_MULTIPLIER = 1.5x)
function calcCritical(attackerAttr, defenderAttr) {
  const bonus  = isFavorable(attackerAttr, defenderAttr) ? CRIT_BONUS_RATE : 0
  const rate   = CRIT_BASE_RATE + bonus
  const isCrit = Math.random() < rate
  return { isCrit, critMult: isCrit ? CRIT_MULTIPLIER : 1.0 }
}

// GDD 13절: damage = max(1, 공격력 × 스킬계수 − 방어력) × 상성배율 × 크리티컬배율
function calcDamage({ attack, defense, skillLevel = 1, attackerAttr, defenderAttr }) {
  const coeff     = SKILL_COEFF_BASE + (skillLevel - 1) * SKILL_COEFF_STEP
  const attrMult  = getMultiplier(attackerAttr, defenderAttr)
  const { isCrit, critMult } = calcCritical(attackerAttr, defenderAttr)
  const base      = Math.max(1, Math.floor(attack * coeff - defense))
  const total     = Math.floor(base * attrMult * critMult)
  return { damage: Math.max(1, total), isCrit, attrMult }
}

module.exports = { CRIT_BASE_RATE, CRIT_BONUS_RATE, CRIT_MULTIPLIER, SKILL_COEFF_BASE, SKILL_COEFF_STEP, getMultiplier, isFavorable, calcCritical, calcDamage }
