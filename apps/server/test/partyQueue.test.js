const { test } = require('node:test')
const assert = require('node:assert/strict')
const partyQueue = require('../realtime/partyQueue')

// forming Map은 zoneId별로 독립이므로, 테스트마다 유일한 zoneId를 써서
// 모듈 전역 상태를 공유해도 서로 간섭하지 않게 한다.
let zoneSeq = 0
const nextZone = () => `test-zone-${++zoneSeq}`

test('join — 1명만 모이면 waiting, 그레이스 타이머 없음', () => {
  const zoneId = nextZone()
  const r = partyQueue.join(zoneId, { userId: 'p1' }, { onLock: () => assert.fail('lock되면 안 됨') })
  assert.equal(r.status, 'waiting')
  assert.equal(r.count, 1)
  partyQueue.leave(zoneId, 'p1')
})

test('join — 2명이 모이면 forming 상태로 그레이스 타이머 시작, 만료 시 2명으로 확정', () => {
  const zoneId = nextZone()
  let locked = null
  const onLock = members => { locked = members }

  const r1 = partyQueue.join(zoneId, { userId: 'p1' }, { graceMs: 10, onLock })
  assert.equal(r1.status, 'waiting')
  const r2 = partyQueue.join(zoneId, { userId: 'p2' }, { graceMs: 10, onLock })
  assert.equal(r2.status, 'forming')
  assert.equal(r2.count, 2)
  assert.equal(locked, null) // 아직 그레이스 중이라 lock 안 됨

  return new Promise(resolve => {
    setTimeout(() => {
      assert.ok(locked)
      assert.deepEqual(locked.map(m => m.userId), ['p1', 'p2'])
      assert.equal(partyQueue.groupSize(zoneId), 0) // lock 후 그룹 제거됨
      resolve()
    }, 20)
  })
})

test('join — 그레이스 안에 3번째가 들어오면 즉시 확정(타이머 대기 없음)', () => {
  const zoneId = nextZone()
  let locked = null
  const onLock = members => { locked = members }

  partyQueue.join(zoneId, { userId: 'p1' }, { graceMs: 5000, onLock })
  partyQueue.join(zoneId, { userId: 'p2' }, { graceMs: 5000, onLock })
  const r3 = partyQueue.join(zoneId, { userId: 'p3' }, { graceMs: 5000, onLock })

  assert.equal(r3.status, 'forming')
  assert.equal(r3.count, 3)
  assert.ok(locked, '3명째 join 시점에 동기적으로 lock되어야 함')
  assert.deepEqual(locked.map(m => m.userId), ['p1', 'p2', 'p3'])
  assert.equal(partyQueue.groupSize(zoneId), 0)
})

test('join — 같은 userId가 중복 join하면 already_waiting', () => {
  const zoneId = nextZone()
  partyQueue.join(zoneId, { userId: 'p1' }, { onLock: () => {} })
  const r = partyQueue.join(zoneId, { userId: 'p1' }, { onLock: () => {} })
  assert.equal(r.status, 'already_waiting')
  assert.equal(r.count, 1)
  partyQueue.leave(zoneId, 'p1')
})

test('leave — 2명 상태에서 1명이 나가면 그레이스 타이머가 취소되어 lock 안 됨', () => {
  const zoneId = nextZone()
  let locked = null
  partyQueue.join(zoneId, { userId: 'p1' }, { graceMs: 10, onLock: () => { locked = true } })
  partyQueue.join(zoneId, { userId: 'p2' }, { graceMs: 10, onLock: () => { locked = true } })
  partyQueue.leave(zoneId, 'p2')
  assert.equal(partyQueue.groupSize(zoneId), 1)

  return new Promise(resolve => {
    setTimeout(() => {
      assert.equal(locked, null)
      partyQueue.leave(zoneId, 'p1')
      resolve()
    }, 20)
  })
})
