const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildContext } = require('../dist')

const pet = (id, name, extra = {}) => ({
  id, name, attribute: 'fire', level: id * 2, evolution_stage: 1, is_fainted: 0,
  conditions: { hunger: 15.4, happiness: 80, cleanliness: 60, energy: 100 }, ...extra,
})

function fakeGame(pets, inventories = {}) {
  const calls = []
  return {
    calls,
    getPets: () => { calls.push('getPets'); return pets },
    getInventory: petId => { calls.push(`getInventory:${petId}`); return inventories[petId] ?? [] },
    useItem: () => assert.fail('컨텍스트는 상태를 바꾸지 않음'),
    getZones: () => [], startAutoHunt: () => assert.fail('컨텍스트는 상태를 바꾸지 않음'), getParty: () => ({ members: [], synergy: null }),
  }
}

const food = { item_id: 'pet_food', quantity: 3, data: { name: '펫 사료', type: 'consumable', effect: 'hunger_restore' } }

test('잡담 — 펫 이름·레벨만 짧게, 가방은 조회하지 않음', () => {
  const game = fakeGame([pet(1, '불꽃이'), pet(2, '물방울')], { 1: [food] })
  const ctx = buildContext(game, { kind: 'chat', tools: [] }, { maxPets: 6 })
  assert.equal(ctx.text, '내 펫: 불꽃이(Lv2), 물방울(Lv4)')
  assert.deepEqual(ctx.parts, ['pets_brief'])
  assert.deepEqual(game.calls, ['getPets'])
})

test('tool 경로 — 펫 상태 수치를 넣고, 가방 tool이 없으면 가방은 넣지 않음', () => {
  const game = fakeGame([pet(1, '불꽃이')], { 1: [food] })
  const ctx = buildContext(game, { kind: 'tools', tools: ['get_pets', 'get_hunting_zones'] }, { maxPets: 6 })
  assert.match(ctx.text, /id 1 불꽃이 Lv2 fire 배고픔 15 행복 80 청결 60 에너지 100/)
  assert.doesNotMatch(ctx.text, /사료/)
  assert.deepEqual(ctx.parts, ['pets'])
  assert.ok(!game.calls.some(c => c.startsWith('getInventory')))
})

test('아이템 tool이 있으면 펫별 가방 요약(itemId·이름·개수·효과)도 넣음', () => {
  const game = fakeGame([pet(1, '불꽃이'), pet(2, '물방울')], { 1: [food] })
  const ctx = buildContext(game, { kind: 'tools', tools: ['get_pets', 'get_inventory', 'use_item'] }, { maxPets: 6 })
  assert.match(ctx.text, /id 1 가방: pet_food 펫 사료 x3 hunger_restore/)
  assert.match(ctx.text, /id 2 가방: 비어 있음/)
  assert.deepEqual(ctx.parts, ['pets', 'inventory'])
})

test('기절한 펫 표시, 펫 수 상한을 넘으면 나머지는 개수만', () => {
  const pets = [pet(1, 'a', { is_fainted: 1 }), pet(2, 'b'), pet(3, 'c')]
  const ctx = buildContext(fakeGame(pets), { kind: 'tools', tools: ['get_pets'] }, { maxPets: 2 })
  assert.match(ctx.text, /id 1 a .* 기절/)
  assert.doesNotMatch(ctx.text, /id 3/)
  assert.match(ctx.text, /외 1마리/)
})

test('펫이 없으면 그렇게 적음', () => {
  assert.equal(buildContext(fakeGame([]), { kind: 'chat', tools: [] }, { maxPets: 6 }).text, '내 펫: 없음')
  assert.match(buildContext(fakeGame([]), { kind: 'tools', tools: ['get_pets'] }, { maxPets: 6 }).text, /펫 없음/)
})
