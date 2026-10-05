const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

// GymSystem은 배지를 DB에서 읽으므로 require 캐시에 메모리 배지 테이블 스텁 주입
const badges = []
const dbPath = path.join(__dirname, '../src/db/database.js')
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: () => [...badges],
    run:   (_sql, [badge_id, leader_id, attribute, tier, earned_at]) => badges.push({ badge_id, leader_id, attribute, tier, earned_at }),
  },
}

const GymSystem = require('../src/game/systems/GymSystem')

function makeSystem() {
  badges.length = 0
  return new GymSystem({ save: () => {} })
}

test('canChallenge — 1단계는 바로, 다음 단계는 앞 단계 배지가 있어야', () => {
  const gs = makeSystem()
  assert.equal(gs.canChallenge('gym1_fire', 1).ok, true)
  assert.match(gs.canChallenge('gym1_fire', 2).error, /1단계 배지/)
  gs.awardBadge('gym1_fire', 1)
  assert.equal(gs.canChallenge('gym1_fire', 2).ok, true)
  assert.equal(gs.canChallenge('gym1_water', 2).ok, false) // 다른 관장 배지는 별개
})

test('canChallenge — 없는 관장·단계는 거부', () => {
  const gs = makeSystem()
  assert.equal(gs.canChallenge('gym1_omni', 1).ok, false)
  assert.equal(gs.canChallenge('gym1_fire', 4).ok, false)
})

test('awardBadge — 처음만 새 배지, 이름은 "속성 배지 n단계"', () => {
  const gs = makeSystem()
  assert.deepEqual(gs.awardBadge('gym1_ice', 1), { badgeId: 'gym1_ice_t1', name: '얼음 배지 1단계', isNew: true })
  assert.equal(gs.awardBadge('gym1_ice', 1).isNew, false)
  assert.equal(badges.length, 1)
})

test('getBadgeBonus — 그 속성 배지 단계마다 +2%', () => {
  const gs = makeSystem()
  assert.equal(gs.getBadgeBonus('fire'), 1)
  gs.awardBadge('gym1_fire', 1)
  gs.awardBadge('gym1_fire', 2)
  gs.awardBadge('gym1_water', 1)
  assert.equal(gs.getBadgeBonus('fire'), 1.04)
  assert.equal(gs.getBadgeBonus('water'), 1.02)
})

test('getGymView — 단계별 획득·도전 가능·권장 레벨', () => {
  const gs = makeSystem()
  gs.awardBadge('gym1_fire', 1)
  const fire = gs.getGymView('gym1').leaders.find(l => l.id === 'gym1_fire')
  assert.deepEqual(fire.tiers.map(t => [t.earned, t.open, t.level]), [[true, true, '1~10'], [false, true, '11~20'], [false, false, '21~30']])
})
