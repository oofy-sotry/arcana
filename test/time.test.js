const { test } = require('node:test')
const assert = require('node:assert/strict')
const { AGE_DURATION_SECONDS, TICK_INTERVAL_SECONDS, getElapsedSeconds, secondsToAge, calcOfflineTicks } =
  require('../src/game/utils/time')

test('secondsToAge — AGE_DURATION_SECONDS 경과당 1살', () => {
  assert.equal(secondsToAge(0), 0)
  assert.equal(secondsToAge(AGE_DURATION_SECONDS - 1), 0)
  assert.equal(secondsToAge(AGE_DURATION_SECONDS), 1)
  assert.equal(secondsToAge(AGE_DURATION_SECONDS * 70), 70)
})

test('calcOfflineTicks — TICK_INTERVAL_SECONDS 단위로 내림', () => {
  assert.equal(calcOfflineTicks(0), 0)
  assert.equal(calcOfflineTicks(TICK_INTERVAL_SECONDS - 1), 0)
  assert.equal(calcOfflineTicks(TICK_INTERVAL_SECONDS), 1)
  assert.equal(calcOfflineTicks(TICK_INTERVAL_SECONDS * 3 + 5), 3)
})

test('getElapsedSeconds — 밀리초 차이를 초 단위로, 음수는 0으로 클램프', () => {
  const now = 1_000_000
  assert.equal(getElapsedSeconds(now - 5000, now), 5)
  assert.equal(getElapsedSeconds(now + 5000, now), 0) // 미래 시각이면 0
})
