const { getMultiplier, isFavorable } = require('../data/attributes')

const CRIT_BASE_RATE   = 0.10
const CRIT_BONUS_RATE  = 0.15 // 상성 유리 시 추가
const CRIT_MULTIPLIER  = 1.5
const SKILL_COEFF_BASE = 1.0
const SKILL_COEFF_STEP = 0.1 // 스킬 레벨당 증가량

module.exports = { CRIT_BASE_RATE, CRIT_BONUS_RATE, CRIT_MULTIPLIER, SKILL_COEFF_BASE, SKILL_COEFF_STEP, getMultiplier, isFavorable }
