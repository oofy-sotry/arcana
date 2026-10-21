const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

// ItemSystem은 모듈 최상단에서 db를 require하므로 require 캐시에 메모리 인벤토리 스텁 주입
const inventory = new Map() // itemId → quantity (펫 1마리 기준)
const dbPath = path.join(__dirname, '../src/db/database.js')
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: (_sql, [, itemId]) => (inventory.has(itemId) ? [{ quantity: inventory.get(itemId) }] : []),
    run:   (_sql, [qty, , itemId]) => { inventory.set(itemId, inventory.get(itemId) - qty) },
  },
}

const ItemSystem = require('../src/game/systems/ItemSystem')

function makeSystem(coins = 0) {
  inventory.clear()
  const pet = { id: 1, coins }
  const Pet = { getPet: () => ({ ...pet }), updatePet: (_id, fields) => Object.assign(pet, fields) }
  return { is: new ItemSystem({ Pet, save: () => {} }), pet }
}

test('getSellPrice — 구매가의 절반, 상점가 없으면 0', () => {
  const { is } = makeSystem()
  assert.equal(is.getSellPrice('pet_food'), 10)      // 20 → 10
  assert.equal(is.getSellPrice('life_charm'), 75)    // 150 → 75
  assert.equal(is.getSellPrice('revive_stone'), 0)   // 상점가 없음
})

test('sellItem — 수량만큼 빼고 코인 지급', () => {
  const { is, pet } = makeSystem(5)
  inventory.set('pet_food', 3)
  const r = is.sellItem(1, 'pet_food', 2)
  assert.deepEqual(r, { ok: true, itemId: 'pet_food', quantity: 2, earned: 20, remainingCoins: 25 })
  assert.equal(inventory.get('pet_food'), 1)
  assert.equal(pet.coins, 25)
})

test('sellItem — 팔 수 없는 아이템·수량 부족은 거부', () => {
  const { is, pet } = makeSystem(0)
  inventory.set('revive_stone', 1)
  assert.equal(is.sellItem(1, 'revive_stone').ok, false)
  inventory.set('pet_food', 1)
  assert.equal(is.sellItem(1, 'pet_food', 2).error, '가진 수량이 부족합니다')
  assert.equal(pet.coins, 0)
})
