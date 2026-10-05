const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

// FaintSystem은 아이템 플래그를 world_state에서 읽으므로 require 캐시에 메모리 스텁 주입
const flags = new Map()
const dbPath = path.join(__dirname, '../src/db/database.js')
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: (_sql, [key]) => (flags.has(key) ? [{ value: flags.get(key) }] : []),
    run:   (_sql, [key]) => { flags.delete(key) },
  },
}

const FaintSystem = require('../src/game/systems/FaintSystem')

function makeSystem(petFields = {}) {
  flags.clear()
  const pet = { id: 1, is_alive: 1, faint_count: 0, is_fainted: 0, ...petFields }
  const Pet = {
    getPet:    () => ({ ...pet }),
    updatePet: (_id, fields) => Object.assign(pet, fields),
  }
  return { fs: new FaintSystem({ Pet, save: () => {} }), pet }
}

test('recordLoss — 기절 3번까지는 기절, 횟수 +1', () => {
  const { fs, pet } = makeSystem()
  for (let i = 1; i <= 3; i++) {
    const r = fs.recordLoss(pet)
    assert.deepEqual(r, { fainted: true, died: false, faintCount: i })
  }
  assert.equal(pet.is_fainted, 1)
  assert.equal(pet.is_alive, 1)
})

test('recordLoss — 기절 3번 이후 패배는 죽음', () => {
  const { fs, pet } = makeSystem({ faint_count: 3 })
  const r = fs.recordLoss(pet)
  assert.equal(r.died, true)
  assert.equal(pet.is_alive, 0)
})

test('recordLoss — 생명의 부적은 이번 기절을 횟수에 안 넣고 죽음도 막음', () => {
  const { fs, pet } = makeSystem({ faint_count: 3 })
  flags.set('death_shield_1', '1')
  const r = fs.recordLoss(pet)
  assert.equal(r.shielded, true)
  assert.equal(pet.is_alive, 1)
  assert.equal(pet.faint_count, 3)
  assert.equal(flags.has('death_shield_1'), false)
})

test('revive — 부활석은 죽은 펫을 기절 횟수 0, HP·MP 가득 찬 상태로 되살림', () => {
  const { fs, pet } = makeSystem({ is_alive: 0, faint_count: 3, cur_hp: 0, cur_mp: 2 })
  assert.deepEqual(fs.revive(1), { ok: true, name: undefined })
  assert.equal(pet.is_alive, 1)
  assert.equal(pet.faint_count, 0)
  assert.equal(pet.cur_hp, null)
  assert.equal(fs.revive(1).ok, false) // 살아 있으면 거부
})

test('applyDailyDecay — 하루당 -1, 0 미만 불가, 같은 날은 그대로', () => {
  const { fs, pet } = makeSystem({ faint_count: 3, faint_decay_day: '2026-10-05' })
  assert.equal(fs.applyDailyDecay(pet, '2026-10-05'), 3)
  assert.equal(fs.applyDailyDecay({ ...pet }, '2026-10-07'), 1)
  assert.equal(pet.faint_decay_day, '2026-10-07')
  assert.equal(fs.applyDailyDecay({ ...pet }, '2026-10-20'), 0)
})

test('applyDailyDecay — 처음 보는 펫은 오늘부터 셈', () => {
  const { fs, pet } = makeSystem({ faint_count: 2 })
  assert.equal(fs.applyDailyDecay(pet, '2026-10-05'), 2)
  assert.equal(pet.faint_decay_day, '2026-10-05')
})

test('treat — 기절 상태는 항상 풀고, 횟수 감소는 하루 1번', () => {
  const { fs, pet } = makeSystem({ faint_count: 2, is_fainted: 1 })
  let r = fs.treat({ ...pet }, '2026-10-05')
  assert.deepEqual(r, { revived: true, reduced: true, faintCount: 1 })
  assert.equal(pet.is_fainted, 0)
  assert.equal(pet.cur_hp, null) // HP 가득 참

  pet.is_fainted = 1
  r = fs.treat({ ...pet }, '2026-10-05')
  assert.deepEqual(r, { revived: true, reduced: false, faintCount: 1 })
  assert.equal(pet.is_fainted, 0)

  r = fs.treat({ ...pet }, '2026-10-06')
  assert.equal(r.reduced, true)
  assert.equal(pet.faint_count, 0)
})
