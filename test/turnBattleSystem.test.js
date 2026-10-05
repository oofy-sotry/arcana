const { test } = require('node:test')
const assert = require('node:assert/strict')

const TurnBattleSystem = require('../src/game/systems/TurnBattleSystem')
const { ZONES, getMonster } = require('../src/game/data/monsters')

const zone = ZONES.find(z => z.id === 'zone_1_fire')

function withRandom(value, fn) {
  const orig = Math.random
  Math.random = () => value
  try { return fn() } finally { Math.random = orig }
}

// stats: 펫 스탯 덮어쓰기, opts: 시스템 스텁 덮어쓰기
function makeSystem(petList, opts = {}) {
  const pets = petList.map((p, i) => ({
    id: i + 1, name: `펫${i + 1}`, attribute: 'water', evolution_stage: 0, level: 1, species: 'default',
    hp: 100, mp: 50, attack: 30, defense: 10, speed: 20, coins: 0, affinity: 0, is_alive: 1, is_fainted: 0, ...p,
  }))
  const energy = { 1: 100 }
  const calls = { victory: 0, losses: [], created: [], mapSaved: null, consumed: [] }
  const Pet = {
    getAllPets: () => pets.filter(p => p.is_alive),
    getPet: id => pets.find(p => p.id === id),
    updatePet: (id, f) => Object.assign(pets.find(p => p.id === id) || {}, f),
    getConditions: id => ({ energy: energy[id] ?? 100 }),
    updateConditions: (id, f) => { energy[id] = f.energy },
    createPet: (name, attribute) => { const p = { id: 99, name, attribute }; calls.created.push(p); return p },
  }
  const sys = new TurnBattleSystem({
    Pet, save: () => {},
    gymSystem: {
      canChallenge: (leaderId, tier) => (opts.gymLocked ? { ok: false, error: '1단계 배지를 먼저 받아야 합니다' } : { ok: true }),
      awardBadge: (leaderId, tier) => { calls.badge = { leaderId, tier }; return { badgeId: `${leaderId}_t${tier}`, name: '불꽃 배지 1단계', isNew: true } },
    },
    combatSystem: {
      buildCombatant: pet => ({ effectivePet: { ...pet }, maxHp: pet.hp, passives: [], dotPerTurn: 0 }),
      grantVictory: () => { calls.victory++; return { drops: [], coins: 10 } },
    },
    skillSystem: {
      getUnlockedActives: () => opts.skills || [],
      getSkillMpCost: () => 10,
    },
    itemSystem: {
      getInventory: () => [],
      consumeItem: (petId, itemId) => { calls.consumed.push(itemId); return opts.hasItem !== false },
    },
    partySystem: { getParty: () => ({ members: [] }) },
    faintSystem: { recordLoss: id => { calls.losses.push(id); return { fainted: true, died: false, faintCount: 1 } } },
    huntingSystem: { canEnterZone: id => ZONES.find(z => z.id === id) || null },
    summonerSystem: {
      getSummoner: () => ({ id: 1 }),
      getMapState: () => ({ map_id: opts.mapId || 'forest1' }),
      saveMapState: (_id, mapId, x, y) => { calls.mapSaved = { mapId, x, y } },
    },
  })
  return { sys, pets, energy, calls }
}

test('start — 싸울 펫이 없으면 거부, 기절한 펫은 제외, 선두 에너지 -15', () => {
  assert.match(makeSystem([{ is_fainted: 1 }]).sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] }).error, /싸울 수 있는/)
  const { sys, energy } = makeSystem([{}, { is_fainted: 1 }, {}])
  const r = sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  assert.equal(r.state.party.length, 2)
  assert.equal(energy[1], 85)
  assert.equal(r.state.moves[0].id, 'basic')
})

test('start — 다른 구역 몬스터는 거부', () => {
  const { sys } = makeSystem([{}])
  assert.match(sys.start({ zoneId: zone.id, monsterId: 'water_5_a' }).error, /이 구역의 몬스터가 아닙니다/)
})

test('기본 공격으로 이기면 보상·친밀도·쓰러진 펫 없음', () => {
  const { sys, pets, calls } = makeSystem([{ attack: 500, speed: 99 }])
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  const r = sys.act({ type: 'skill', moveId: 'basic' })
  assert.equal(r.outcome.result, 'won')
  assert.equal(calls.victory, 1)
  assert.equal(pets[0].affinity, 1)
  assert.equal(sys.session, null)
})

test('선두가 쓰러지면 교체를 강제, 교체는 상대 턴 없이', () => {
  const { sys } = makeSystem([{ hp: 1, speed: 1, defense: 0 }, { hp: 9999 }])
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  const r1 = withRandom(0.99, () => sys.act({ type: 'skill', moveId: 'basic' }))
  assert.equal(r1.state.needSwitch, true)
  assert.match(sys.act({ type: 'skill', moveId: 'basic' }).error, /교체할/)
  const r2 = sys.act({ type: 'switch', index: 1 })
  assert.equal(r2.state.active, 1)
  assert.equal(r2.events.filter(e => e.actor === 'monster').length, 0)
})

test('전멸 — 도망 실패한 펫만 기절 처리, 맵 healPoint(없으면 마을 회복소)로 이동', () => {
  const { sys, calls } = makeSystem([{ hp: 1, speed: 1, defense: 0 }], { mapId: 'no_such_map' })
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  const r = withRandom(0.99, () => sys.act({ type: 'skill', moveId: 'basic' }))
  assert.equal(r.outcome.result, 'lost')
  assert.equal(r.outcome.wipe[0].escaped, false)
  assert.deepEqual(calls.losses, [1])
  assert.deepEqual(calls.mapSaved, { mapId: 'center1', x: 5, y: 6 })
})

test('전멸 — 도망 성공하면 기절 없음', () => {
  const { sys, calls } = makeSystem([{ hp: 1, speed: 1, defense: 0 }])
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  // random 0 → 몬스터 선공으로 쓰러진 뒤 도망 판정(0 < 90%)은 성공
  const r = withRandom(0, () => sys.act({ type: 'skill', moveId: 'basic' }))
  assert.equal(r.outcome.wipe[0].escaped, true)
  assert.deepEqual(calls.losses, [])
})

test('포획 성공 — 그 몬스터가 펫이 됨', () => {
  const { sys, calls } = makeSystem([{}])
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  const r = withRandom(0, () => sys.act({ type: 'item', itemId: 'capture_orb' }))
  assert.equal(r.outcome.result, 'captured')
  assert.equal(calls.created[0].name, getMonster(zone.monsterIds[0]).name)
})

test('가방에 없는 아이템은 거부', () => {
  const { sys } = makeSystem([{}], { hasItem: false })
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  assert.match(sys.act({ type: 'item', itemId: 'capture_orb' }).error, /없습니다/)
})

test('도망 성공 — 전투 종료', () => {
  const { sys } = makeSystem([{}])
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  assert.equal(withRandom(0, () => sys.act({ type: 'run' })).outcome.result, 'ran')
})

test('자동 — 쓸 수 있는 공격 기술 중 배율이 가장 큰 것', () => {
  const skills = [
    { skill_id: 'weak',  skill_level: 1, data: { name: '약', type: 'active', effect: { type: 'damage', multiplier: 1.2 } } },
    { skill_id: 'strong', skill_level: 1, data: { name: '강', type: 'active', effect: { type: 'damage', multiplier: 2.5 } } },
  ]
  const { sys } = makeSystem([{ attack: 1, hp: 9999 }], { skills })
  sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  const r = sys.act({ type: 'auto' })
  assert.equal(r.events.find(e => e.actor === 'pet').move, '강')
})

test('확률 — 포획은 HP가 적을수록·tier가 낮을수록, 전멸 도망은 tier가 높을수록 낮음', () => {
  const t1 = { tier: 1 }, t5 = { tier: 5 }
  assert.ok(TurnBattleSystem.captureChance(t1, 0.1) > TurnBattleSystem.captureChance(t1, 1))
  assert.ok(TurnBattleSystem.captureChance(t1, 0.5) > TurnBattleSystem.captureChance(t5, 0.5))
  assert.ok(TurnBattleSystem.captureChance({ tier: 1, isBoss: true }, 0.5) < TurnBattleSystem.captureChance(t1, 0.5))
  assert.equal(TurnBattleSystem.wipeEscapeChance(1), 0.9)
  assert.equal(TurnBattleSystem.wipeEscapeChance(9), 0.2)
})

test('HP·MP — 이전 전투에서 남은 값으로 시작하고, 끝나면 저장', () => {
  const { sys, pets } = makeSystem([{ attack: 500, speed: 99, cur_hp: 40, cur_mp: 7 }])
  const r = sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  assert.equal(r.state.party[0].hp, 40)
  assert.equal(r.state.party[0].mp, 7)
  sys.act({ type: 'skill', moveId: 'basic' })
  assert.equal(pets[0].cur_hp, 40)
  assert.equal(pets[0].cur_mp, 7)
})

test('HP·MP — 저장된 값이 없으면 가득 찬 상태로 시작', () => {
  const { sys } = makeSystem([{ hp: 120, mp: 30 }])
  const r = sys.start({ zoneId: zone.id, monsterId: zone.monsterIds[0] })
  assert.equal(r.state.party[0].hp, 120)
  assert.equal(r.state.party[0].mp, 30)
})

test('관장전 — 상대가 쓰러지면 다음 몬스터, 마지막까지 이기면 배지·상금', () => {
  const { sys, pets, calls } = makeSystem([{ attack: 5000, speed: 99 }])
  const r0 = sys.start({ gymLeaderId: 'gym1_fire', tier: 1 })
  assert.equal(r0.state.trainer.remaining, 3)
  assert.equal(r0.events[0].type, 'challenge')
  const r1 = sys.act({ type: 'skill', moveId: 'basic' })
  assert.ok(r1.events.some(e => e.type === 'send'))
  assert.equal(r1.state.trainer.remaining, 2)
  sys.act({ type: 'skill', moveId: 'basic' })
  const r3 = sys.act({ type: 'skill', moveId: 'basic' })
  assert.equal(r3.outcome.result, 'won')
  assert.deepEqual(calls.badge, { leaderId: 'gym1_fire', tier: 1 })
  assert.ok(r3.outcome.prize > 0)
  assert.equal(calls.victory, 3) // 쓰러뜨린 몬스터마다 보상
  assert.equal(pets[0].coins, r3.outcome.prize)
})

test('관장전 — 도망·포획 불가, 앞 단계 배지 없으면 시작 불가', () => {
  assert.match(makeSystem([{}], { gymLocked: true }).sys.start({ gymLeaderId: 'gym1_fire', tier: 2 }).error, /배지/)
  const { sys, calls } = makeSystem([{}])
  sys.start({ gymLeaderId: 'gym1_fire', tier: 1 })
  assert.match(sys.act({ type: 'run' }).error, /도망칠 수 없다/)
  assert.match(sys.act({ type: 'item', itemId: 'capture_orb' }).error, /잡을 수 없다/)
  assert.deepEqual(calls.consumed, []) // 구슬은 소모 안 됨
})
