const { test } = require('node:test')
const assert = require('node:assert/strict')
const { runHunt, REGULAR_ENCOUNTER_COUNT } = require('../realtime/huntMatch')

// zone_1_fire: fire_1_a(hp65,atk12,def5) / fire_1_b / fire_1_boss(hp195,atk24,def8) 실데이터 사용.
// attribute를 몬스터와 동일한 'fire'로 맞춰 상성배율을 1.0으로 고정하고,
// 공격력/방어력 차를 극단적으로 벌려 calcDamage의 크리티컬 랜덤성이 결과(생사)를
// 못 뒤집게 만든 뒤 구조적 결과(클리어/전멸 여부, 이벤트 종류)만 검증한다.
const ZONE_ID = 'zone_1_fire'

test('runHunt — 압도적으로 강한 파티는 4마리(일반3+보스1) 전부 클리어', () => {
  const member = {
    userId: 'h1', username: 'h1',
    pet: { name: 'h1', attribute: 'fire', level: 50, hp: 50, attack: 1000, defense: 100, speed: 100 },
  }
  const events = []

  return new Promise(resolve => {
    runHunt(ZONE_ID, [member], {
      turnDelayMs: 0,
      broadcast: e => events.push(e),
      onEnd: summary => {
        assert.equal(summary.reason, 'cleared')
        assert.equal(summary.cleared, REGULAR_ENCOUNTER_COUNT + 1)
        assert.equal(summary.total, REGULAR_ENCOUNTER_COUNT + 1)
        assert.equal(events.filter(e => e.type === 'monster:defeated').length, REGULAR_ENCOUNTER_COUNT + 1)
        resolve()
      },
    })
  })
})

test('runHunt — 방어력 0에 HP 1인 파티는 첫 몬스터에게 전멸', () => {
  const member = {
    userId: 'h2', username: 'h2',
    pet: { name: 'h2', attribute: 'fire', level: 1, hp: 1, attack: 1, defense: 0, speed: 100 },
  }

  return new Promise(resolve => {
    runHunt(ZONE_ID, [member], {
      turnDelayMs: 0,
      broadcast: () => {},
      onEnd: summary => {
        assert.equal(summary.reason, 'wiped')
        assert.equal(summary.cleared, 0)
        resolve()
      },
    })
  })
})

test('runHunt — removeMember로 마지막 생존자가 빠지면 즉시 전멸 처리', () => {
  const member = {
    userId: 'h3', username: 'h3',
    pet: { name: 'h3', attribute: 'fire', level: 50, hp: 999, attack: 1, defense: 100, speed: 100 },
  }
  let ended = null
  const controller = runHunt(ZONE_ID, [member], {
    turnDelayMs: 1000, // 자연 진행으로 먼저 끝나지 않도록 충분히 길게
    broadcast: () => {},
    onEnd: summary => { ended = summary },
  })

  controller.removeMember('h3')
  assert.ok(ended)
  assert.equal(ended.reason, 'wiped')
})

test('runHunt — 존재하지 않는 zoneId는 invalid_zone으로 즉시 종료', () => {
  let ended = null
  runHunt('no-such-zone', [], {
    turnDelayMs: 0,
    broadcast: () => {},
    onEnd: summary => { ended = summary },
  })
  assert.equal(ended.reason, 'invalid_zone')
})
