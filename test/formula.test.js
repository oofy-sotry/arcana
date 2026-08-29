const { test } = require('node:test')
const assert = require('node:assert/strict')
const { calcDamage, getAttributeMultiplier, isFavorable } = require('../src/game/utils/formula')

test('getAttributeMultiplier — 상성표를 그대로 반환', () => {
  assert.equal(getAttributeMultiplier('fire', 'wind'), 1.3)   // 유리
  assert.equal(getAttributeMultiplier('fire', 'water'), 0.77) // 불리
  assert.equal(getAttributeMultiplier('fire', 'fire'), 1.0)   // 중립
  assert.equal(getAttributeMultiplier('omni', 'fire'), 2.0)   // 옴니 전속성 유리
})

test('isFavorable — 배율 1.3 이상만 유리로 판정', () => {
  assert.equal(isFavorable('fire', 'wind'), true)
  assert.equal(isFavorable('fire', 'fire'), false)
  assert.equal(isFavorable('fire', 'water'), false)
})

test('calcDamage — 방어력이 공격력보다 훨씬 높아도 최소 1 데미지 보장', () => {
  const result = calcDamage({ attack: 10, defense: 100000, skillLevel: 1, attackerAttr: 'fire', defenderAttr: 'fire' })
  assert.equal(result.damage, 1)
})

test('calcDamage — 스킬 레벨이 높을수록 데미지 기댓값이 증가 (계수 계단식 증가)', () => {
  // 크리티컬 변동을 피하기 위해 상성 중립(fire vs fire, 크리티컬 보너스 없음) 대량 샘플 평균 비교
  const N = 3000
  let sumLv1 = 0, sumLv5 = 0
  for (let i = 0; i < N; i++) {
    sumLv1 += calcDamage({ attack: 100, defense: 20, skillLevel: 1, attackerAttr: 'fire', defenderAttr: 'fire' }).damage
    sumLv5 += calcDamage({ attack: 100, defense: 20, skillLevel: 5, attackerAttr: 'fire', defenderAttr: 'fire' }).damage
  }
  assert.ok(sumLv5 / N > sumLv1 / N, `레벨5 평균(${sumLv5 / N})이 레벨1 평균(${sumLv1 / N})보다 커야 함`)
})

test('calcDamage — 반환값 형태(damage/isCrit/attrMult)', () => {
  const result = calcDamage({ attack: 50, defense: 10, skillLevel: 1, attackerAttr: 'water', defenderAttr: 'fire' })
  assert.equal(typeof result.damage, 'number')
  assert.equal(typeof result.isCrit, 'boolean')
  assert.equal(result.attrMult, 1.3) // water는 fire에 유리
})
