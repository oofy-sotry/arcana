const { test } = require('node:test')
const assert = require('node:assert/strict')
const { AGE_DURATION_SECONDS, TICK_INTERVAL_SECONDS, getElapsedSeconds, secondsToAge, calcOfflineTicks, toDayKey, daysBetween } =
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

test('toDayKey — 로컬 날짜를 YYYY-MM-DD로', () => {
  assert.equal(toDayKey(new Date(2026, 0, 5, 23, 59).getTime()), '2026-01-05')
  assert.equal(toDayKey(new Date(2026, 9, 6, 0, 0).getTime()), '2026-10-06')
})

test('daysBetween — 날짜 키 사이 날 수, 역순이면 0', () => {
  assert.equal(daysBetween('2026-10-05', '2026-10-05'), 0)
  assert.equal(daysBetween('2026-10-05', '2026-10-06'), 1)
  assert.equal(daysBetween('2026-09-30', '2026-10-03'), 3)
  assert.equal(daysBetween('2026-10-06', '2026-10-05'), 0)
})
