const { test } = require('node:test')
const assert = require('node:assert/strict')
const LevelSystem = require('../src/game/systems/LevelSystem')

// Pet 모델을 DB 없이 메모리 스텁으로 대체 — LevelSystem은 Electron/DB에 직접 의존하지 않음
function makeStubPet(initial) {
  const store = { ...initial }
  return {
    store,
    getPet: id => (id === store.id ? { ...store } : null),
    updatePet: (id, updates) => { if (id === store.id) Object.assign(store, updates) },
  }
}

test('calcStatGrowth — id % 10 해시로 성장 등급 결정 (하 60% / 중 30% / 상 10%)', () => {
  const level = new LevelSystem({ Pet: {}, save: () => {} })
  const low  = level.calcStatGrowth({ id: 5 })  // hash=5 → 하 (1.0배)
  const mid  = level.calcStatGrowth({ id: 6 })  // hash=6 → 중 (1.5배)
  const high = level.calcStatGrowth({ id: 9 })  // hash=9 → 상 (2.0배)
  assert.deepEqual(low,  { hp: 5, mp: 3, attack: 2, defense: 1, speed: 2 })
  assert.deepEqual(mid,  { hp: 8, mp: 5, attack: 3, defense: 2, speed: 3 }) // ceil(5*1.5)=8 등
  assert.deepEqual(high, { hp: 10, mp: 6, attack: 4, defense: 2, speed: 4 })
})

test('calcStatGrowth — summonerSystem의 growth_bonus가 %로 가산됨', () => {
  const summonerSystem = { getActiveStat: key => (key === 'growth_bonus' ? 20 : 0) }
  const level = new LevelSystem({ Pet: {}, save: () => {}, summonerSystem })
  const growth = level.calcStatGrowth({ id: 5 }) // 하 등급 1.0배 × 1.2
  assert.deepEqual(growth, { hp: 6, mp: 4, attack: 3, defense: 2, speed: 3 })
})

test('levelUp — 스탯 증가 + skill_points +1', () => {
  const Pet = makeStubPet({ id: 1, hp: 100, mp: 100, attack: 10, defense: 5, speed: 10, skill_points: 0 })
  const level = new LevelSystem({ Pet, save: () => {} })
  const newLevel = level.levelUp(Pet.store, 3)
  assert.equal(newLevel, 4)
  assert.equal(Pet.store.skill_points, 1)
  assert.ok(Pet.store.hp > 100)
})

test('addExperience — 필요 경험치를 넘으면 여러 레벨 연속 상승', () => {
  const Pet = makeStubPet({ id: 1, level: 1, exp: 0, hp: 100, mp: 100, attack: 10, defense: 5, speed: 10, skill_points: 0 })
  const level = new LevelSystem({ Pet, save: () => {} })
  // getExpRequired(1) = floor(1^1.5*100) = 100, getExpRequired(2) = floor(2^1.5*100) ≈ 282
  const result = level.addExperience(Pet.store, 500)
  assert.ok(result.level > 1, `레벨이 올라야 함 (실제: ${result.level})`)
  assert.equal(Pet.store.level, result.level)
  assert.ok(Pet.store.exp < level.getExpRequired(result.level))
})
