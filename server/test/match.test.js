const { test } = require('node:test')
const assert = require('node:assert/strict')
const { runMatch, MAX_ROUNDS } = require('../realtime/match')

// attack=1, defense=100, attribute 동일(fire vs fire, 배율 1.0)로 맞추면
// calcDamage의 base가 max(1, floor(1*1-100))=1, critMult(1.0/1.5) 적용해도
// floor(1*1*1.0 또는 1.5)=1이라 크리티컬 여부와 무관하게 항상 데미지 1로
// 고정된다 — Math.random()에 좌우되는 크리티컬 판정을 테스트에서 무시해도 됨.
function makeSide(userId, { hp, speed = 10 }) {
  return { userId, username: userId, pet: { name: userId, attribute: 'fire', level: 1, hp, attack: 1, defense: 100, speed } }
}

test('runMatch — 한쪽 HP가 먼저 0이 되면 그 상대가 승리', () => {
  const a = makeSide('a', { hp: 1000, speed: 20 }) // a가 더 빨라 선공
  const b = makeSide('b', { hp: 1, speed: 10 })
  const events = []

  return new Promise(resolve => {
    runMatch(a, b, {
      turnDelayMs: 0,
      broadcast: e => events.push(e),
      onEnd: result => {
        assert.equal(result.winner, 'a')
        assert.equal(result.forfeited, false)
        assert.ok(events.some(e => e.type === 'turn'))
        resolve()
      },
    })
  })
})

test('runMatch — MAX_ROUNDS까지 아무도 죽지 않으면 무승부', () => {
  const a = makeSide('a', { hp: 1000, speed: 20 })
  const b = makeSide('b', { hp: 1000, speed: 10 })

  return new Promise(resolve => {
    runMatch(a, b, {
      turnDelayMs: 0,
      broadcast: () => {},
      onEnd: result => {
        assert.equal(result.winner, 'draw')
        assert.equal(result.log.length, MAX_ROUNDS * 2) // 매 라운드 2턴씩
        resolve()
      },
    })
  })
})

test('runMatch — forfeit() 호출 시 즉시 종료되고 상대가 승리 처리', () => {
  const a = makeSide('a', { hp: 1000, speed: 20 })
  const b = makeSide('b', { hp: 1000, speed: 10 })

  return new Promise(resolve => {
    const controller = runMatch(a, b, {
      turnDelayMs: 1000, // 다음 라운드가 저절로 도달하지 않도록 충분히 길게
      broadcast: () => {},
      onEnd: result => {
        assert.equal(result.winner, 'b')
        assert.equal(result.forfeited, true)
        resolve()
      },
    })
    controller.forfeit('a')
  })
})
