const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createPetTools } = require('../dist')

const pet = (id, extra = {}) => ({
  id, name: `펫${id}`, attribute: 'fire', level: 12, evolution_stage: 1, is_fainted: 0,
  conditions: { pet_id: id, hunger: 22.4, happiness: 80.6, cleanliness: 50, energy: 90.2, last_updated: 0 },
  ...extra,
})

const zone = (i, extra = {}) => ({
  id: `zone_${i}_fire`, name: `구역${i}`, attribute: 'fire', tier: i, minLevel: i * 10 - 9, maxLevel: i * 10,
  accessible: true, recommended: true, edge: 1.234, monsterIds: ['a', 'b'], description: '긴 설명', ...extra,
})

// 기존 게임 시스템 대신 호출만 기록하는 가짜 GameApi
function fakeGame() {
  const calls = []
  const game = {
    calls,
    getPets: () => [pet(1), pet(2, { is_fainted: 1 })],
    getInventory: petId => (petId === 1
      ? [
          { item_id: 'pet_food', quantity: 3, data: { name: '펫 사료', type: 'consumable', effect: 'hunger_restore' } },
          { item_id: 'evo_stone', quantity: 1, data: { name: '진화의 돌', type: 'material', effect: 'none' } },
        ]
      : []),
    useItem: (petId, itemId) => { calls.push(['useItem', petId, itemId]); return { ok: true, effect: 'hunger_restore' } },
    getZones: () => [
      ...Array.from({ length: 12 }, (_, i) => zone(i + 1)),
      zone(20, { recommended: false }),
      zone(21, { accessible: false }),
    ],
    startAutoHunt: (petId, zoneId) => {
      calls.push(['startAutoHunt', petId, zoneId])
      return { battles: [{ monster: 'm', result: 'won' }, { monster: 'm', result: 'won' }, { monster: 'b', result: 'lost' }], finalEnergy: 0 }
    },
    getParty: () => ({ members: [{ ...pet(1), slot: 0 }], synergy: { label: '불꽃' } }),
  }
  return game
}

const byName = (tools, name) => tools.find(t => t.name === name)

test('tool 6개 — 이름 목록', () => {
  const names = createPetTools(fakeGame()).map(t => t.name).sort()
  assert.deepEqual(names, ['get_hunting_zones', 'get_inventory', 'get_party', 'get_pets', 'start_auto_hunt', 'use_item'])
})

test('get_pets — 필요한 필드만, 컨디션은 정수로', () => {
  const res = byName(createPetTools(fakeGame()), 'get_pets').run({})
  assert.deepEqual(res[0], { id: 1, name: '펫1', attribute: 'fire', level: 12, stage: 1, fainted: false, hunger: 22, happiness: 81, cleanliness: 50, energy: 90 })
  assert.equal(res[1].fainted, true)
})

test('get_inventory — 내 펫이 아니면 check 실패, 아이템은 id·이름·수량·종류', () => {
  const t = byName(createPetTools(fakeGame()), 'get_inventory')
  assert.match(t.check({ petId: 99 }), /펫/)
  assert.deepEqual(t.run({ petId: 1 })[0], { itemId: 'pet_food', name: '펫 사료', quantity: 3, type: 'consumable', effect: 'hunger_restore' })
})

test('use_item — 없는 펫·없는 아이템·소모품이 아닌 아이템은 실행 전에 거부', () => {
  const game = fakeGame()
  const t = byName(createPetTools(game), 'use_item')
  assert.match(t.check({ petId: 99, itemId: 'pet_food' }), /펫/)
  assert.match(t.check({ petId: 1, itemId: 'energy_potion' }), /가지고 있지 않/)
  assert.match(t.check({ petId: 1, itemId: 'evo_stone' }), /사용할 수 없/)
  assert.equal(t.check({ petId: 1, itemId: 'pet_food' }), null)
  assert.deepEqual(game.calls, [])
})

test('use_item — 기존 useItem 호출 결과 그대로', () => {
  const game = fakeGame()
  const res = byName(createPetTools(game), 'use_item').run({ petId: 1, itemId: 'pet_food' })
  assert.deepEqual(game.calls, [['useItem', 1, 'pet_food']])
  assert.deepEqual(res, { ok: true, effect: 'hunger_restore' })
})

test('get_hunting_zones — 추천·입장 가능한 구역만 최대 8개, 요약 필드', () => {
  const res = byName(createPetTools(fakeGame()), 'get_hunting_zones').run({ petId: 1 })
  assert.equal(res.length, 8)
  assert.deepEqual(res[0], { zoneId: 'zone_1_fire', name: '구역1', attribute: 'fire', minLevel: 1, maxLevel: 10, edge: 1.2 })
  assert.ok(res.every(z => z.zoneId !== 'zone_20_fire' && z.zoneId !== 'zone_21_fire'))
})

test('start_auto_hunt — 기절한 펫·없는 구역·잠긴 구역은 실행 전 거부', () => {
  const game = fakeGame()
  const t = byName(createPetTools(game), 'start_auto_hunt')
  assert.match(t.check({ petId: 2, zoneId: 'zone_1_fire' }), /기절/)
  assert.match(t.check({ petId: 1, zoneId: 'zone_99_fire' }), /없는 사냥터/)
  assert.match(t.check({ petId: 1, zoneId: 'zone_21_fire' }), /들어갈 수 없/)
  assert.equal(t.check({ petId: 1, zoneId: 'zone_3_fire' }), null)
  assert.deepEqual(game.calls, [])
})

test('start_auto_hunt — 기존 startAutoHunt 호출 후 전투 결과 요약', () => {
  const game = fakeGame()
  const res = byName(createPetTools(game), 'start_auto_hunt').run({ petId: 1, zoneId: 'zone_3_fire' })
  assert.deepEqual(game.calls, [['startAutoHunt', 1, 'zone_3_fire']])
  assert.deepEqual(res, { fights: 3, wins: 2, lost: true, finalEnergy: 0 })
})

test('start_auto_hunt — 시스템 오류는 error로 전달', () => {
  const game = { ...fakeGame(), startAutoHunt: () => ({ error: '에너지 부족' }) }
  assert.deepEqual(byName(createPetTools(game), 'start_auto_hunt').run({ petId: 1, zoneId: 'zone_3_fire' }), { error: '에너지 부족' })
})

test('get_party — 멤버 요약과 시너지', () => {
  const res = byName(createPetTools(fakeGame()), 'get_party').run({})
  assert.deepEqual(res, { members: [{ slot: 0, id: 1, name: '펫1', level: 12, attribute: 'fire' }], synergy: { label: '불꽃' } })
})
