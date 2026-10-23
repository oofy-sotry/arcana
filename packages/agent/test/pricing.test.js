const { test } = require('node:test')
const assert = require('node:assert/strict')
const { estimateCostUsd } = require('../dist')

const config = { pricing: { note: 'x', models: { large: { inputPer1M: 0.25, outputPer1M: 1.5 }, small: { inputPer1M: 0, outputPer1M: 0 } } } }

test('입력·출력 토큰 × 100만 토큰당 단가', () => {
  // 4000 × 0.25/1e6 + 200 × 1.5/1e6 = 0.001 + 0.0003
  assert.equal(estimateCostUsd(config, 'large', { promptTokens: 4000, completionTokens: 200 }), 0.0013)
})

test('로컬 모델은 0', () => {
  assert.equal(estimateCostUsd(config, 'small', { promptTokens: 999, completionTokens: 99 }), 0)
})

test('단가표에 없는 모델은 null (0으로 속이지 않음)', () => {
  assert.equal(estimateCostUsd(config, 'huge', { promptTokens: 1, completionTokens: 1 }), null)
})

test('부동소수 오차 없이 소수 9자리로 반올림', () => {
  assert.equal(estimateCostUsd(config, 'large', { promptTokens: 3, completionTokens: 7 }), 0.000011250)
})
