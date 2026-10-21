const { test } = require('node:test')
const assert = require('node:assert/strict')
const queue = require('../realtime/queue')

// queue.js는 모듈 전역 상태(waiting 배열)를 공유하므로 각 테스트가 끝나면
// 반드시 자신이 넣은 entry를 정리해 다른 테스트에 영향을 주지 않게 한다.

test('join — 1명만 대기 중이면 매칭되지 않음', () => {
  queue.join({ userId: 'q1' })
  assert.equal(queue.size(), 1)
  queue.leave('q1')
  assert.equal(queue.size(), 0)
})

test('join — 2명이 모이면 FIFO로 즉시 매칭되어 대기열에서 빠짐', () => {
  const first = queue.join({ userId: 'q2' })
  assert.equal(first, null)
  const matched = queue.join({ userId: 'q3' })
  assert.deepEqual(matched.map(e => e.userId), ['q2', 'q3'])
  assert.equal(queue.size(), 0)
})

test('join — 이미 대기 중인 userId가 다시 join하면 무시됨', () => {
  queue.join({ userId: 'q4' })
  const result = queue.join({ userId: 'q4' })
  assert.equal(result, null)
  assert.equal(queue.size(), 1)
  queue.leave('q4')
})

test('leave — 대기열에 없는 userId를 leave해도 에러 없이 무시', () => {
  assert.doesNotThrow(() => queue.leave('nonexistent'))
})
