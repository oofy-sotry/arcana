const { test } = require('node:test')
const assert = require('node:assert/strict')
const RealtimeSocket = require('../src/renderer/launcher/services/RealtimeSocket')

test('handleMessage — 타입별 리스너 + 와일드카드(*) 둘 다 호출됨', () => {
  const sock = new RealtimeSocket()
  const typed = []
  const all = []
  sock.on('turn', m => typed.push(m))
  sock.on('*', m => all.push(m.type))

  sock.handleMessage(JSON.stringify({ type: 'turn', damage: 10 }))

  assert.deepEqual(typed, [{ type: 'turn', damage: 10 }])
  assert.deepEqual(all, ['turn'])
})

test('handleMessage — 잘못된 JSON이나 type 없는 메시지는 조용히 무시', () => {
  const sock = new RealtimeSocket()
  let called = false
  sock.on('*', () => { called = true })

  sock.handleMessage('not json')
  sock.handleMessage(JSON.stringify({ noType: true }))
  sock.handleMessage(JSON.stringify(null))

  assert.equal(called, false)
})

test('on() 반환값으로 구독 해지 가능', () => {
  const sock = new RealtimeSocket()
  const received = []
  const unsubscribe = sock.on('result', m => received.push(m.winner))

  sock.handleMessage(JSON.stringify({ type: 'result', winner: 1 }))
  unsubscribe()
  sock.handleMessage(JSON.stringify({ type: 'result', winner: 2 }))

  assert.deepEqual(received, [1])
})

test('connect — 토큰 없으면 소켓을 열지 않고 즉시 auth:error', () => {
  const sock = new RealtimeSocket()
  let error = null
  sock.on('auth:error', e => { error = e })

  sock.connect({ wsUrl: 'ws://localhost:1', token: null })

  assert.deepEqual(error, { error: 'no_token' })
})
