const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createAgentGameApi } = require('../src/main/agentGameApi')

// 호출을 log에 남기는 가짜 게임 시스템
function fakeSystems() {
  const log = []
  const pets = [{ id: 1, name: '불꽃이', level: 5, conditions: { energy: 80 } }]
  return {
    log,
    petSystem:     { getAll: () => pets },
    itemSystem:    {
      getInventory: petId => { log.push(['getInventory', petId]); return [{ item_id: 'apple', quantity: 2 }] },
      useItem:      (pet, itemId) => { log.push(['useItem', pet.id, itemId]); return itemId === 'dark_stone' ? { ok: true, effect: 'dark_evolve' } : { ok: true } },
    },
    skillSystem:   { unlockForStage: pet => log.push(['unlockForStage', pet.id]) },
    huntingSystem: {
      getZones:      pet => { log.push(['getZones', pet?.id ?? null]); return [{ id: 'z1' }] },
      startAutoHunt: (pet, zoneId) => { log.push(['startAutoHunt', pet.id, zoneId]); return { battles: [], finalEnergy: 50 } },
    },
    partySystem:   { getParty: () => ({ members: [], synergy: null }) },
  }
}

test('getPets·getInventory·getParty — 기존 시스템 결과를 그대로 전달', () => {
  const s = fakeSystems()
  const api = createAgentGameApi(s)
  assert.equal(api.getPets()[0].name, '불꽃이')
  assert.deepEqual(api.getInventory(1), [{ item_id: 'apple', quantity: 2 }])
  assert.deepEqual(api.getParty(), { members: [], synergy: null })
})

test('useItem — 펫 객체로 ItemSystem.useItem 호출 (item:use 핸들러와 같은 처리)', () => {
  const s = fakeSystems()
  assert.deepEqual(createAgentGameApi(s).useItem(1, 'apple'), { ok: true })
  assert.deepEqual(s.log, [['useItem', 1, 'apple']])
})

test('useItem — 어둠 진화 아이템이면 새 단계 스킬 해금', () => {
  const s = fakeSystems()
  createAgentGameApi(s).useItem(1, 'dark_stone')
  assert.deepEqual(s.log, [['useItem', 1, 'dark_stone'], ['unlockForStage', 1]])
})

test('없는 펫 — useItem·startAutoHunt는 시스템을 부르지 않고 실패', () => {
  const s = fakeSystems()
  const api = createAgentGameApi(s)
  assert.equal(api.useItem(9, 'apple').ok, false)
  assert.ok('error' in api.startAutoHunt(9, 'z1'))
  assert.deepEqual(s.log, [])
})

test('getZones·startAutoHunt — 펫 객체로 HuntingSystem 호출', () => {
  const s = fakeSystems()
  const api = createAgentGameApi(s)
  assert.deepEqual(api.getZones(1), [{ id: 'z1' }])
  assert.deepEqual(api.startAutoHunt(1, 'z1'), { battles: [], finalEnergy: 50 })
  assert.deepEqual(s.log, [['getZones', 1], ['startAutoHunt', 1, 'z1']])
})
