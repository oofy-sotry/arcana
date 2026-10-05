const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

// HuntingSystem은 함수 안에서 db 모듈을 require하므로, Electron 없이 돌도록 require 캐시에 스텁 주입
const dbPath = path.join(__dirname, '../src/db/database.js')
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { run: () => {}, query: () => [] } }

const HuntingSystem = require('../src/game/systems/HuntingSystem')
const { ZONES } = require('../src/game/data/monsters')

function makeSystem() {
  const fought = []
  const combatSystem = {
    runAutoFight: (pet, monster) => { fought.push(monster.id); return { result: 'won', drops: [], log: [] } },
  }
  const Pet = { updatePet: () => {}, getPet: () => null }
  return { hs: new HuntingSystem({ Pet, save: () => {}, combatSystem }), fought }
}

const pet  = { id: 1, level: 1, attribute: 'fire', hp: 100, attack: 10, defense: 5, conditions: { energy: 100 } }
const zone = ZONES[0]

test('processManualBattle — monsterId를 주면 그 몬스터와 싸움', () => {
  const { hs, fought } = makeSystem()
  for (let i = 0; i < 20; i++) {
    const r = hs.processManualBattle(pet, zone.id, zone.monsterIds[1])
    if (r.hiddenStage) continue
    assert.equal(r.result, 'won')
  }
  assert.ok(fought.length > 0)
  assert.ok(fought.every(id => id === zone.monsterIds[1]))
})

test('processManualBattle — 보스 id 지정 시 isBoss=true', () => {
  const { hs } = makeSystem()
  const r = hs.processManualBattle(pet, zone.id, zone.bossId)
  assert.equal(r.isBoss, true)
})

test('processManualBattle — 다른 구역 몬스터 id는 거부', () => {
  const { hs, fought } = makeSystem()
  const other = ZONES.find(z => z.id !== zone.id)
  const r = hs.processManualBattle(pet, zone.id, other.monsterIds[0])
  assert.equal(r.error, '이 구역의 몬스터가 아닙니다')
  assert.equal(fought.length, 0)
})

test('rollWildEncounter — 지정 tier 구역의 몬스터만 나옴', () => {
  const { hs } = makeSystem()
  for (let i = 0; i < 50; i++) {
    const e = hs.rollWildEncounter([1, 2])
    const z = ZONES.find(z => z.id === e.zoneId)
    assert.ok([1, 2].includes(z.tier))
    assert.ok([...z.monsterIds, z.bossId].includes(e.monsterId))
  }
})

test('rollWildEncounter — 맞는 구역이 없으면 null', () => {
  const { hs } = makeSystem()
  assert.equal(hs.rollWildEncounter([999]), null)
})

test('rollWildEncounter — 낮은 tier일수록 자주 나옴 (60/30/10)', () => {
  const { hs } = makeSystem()
  const count = { 1: 0, 2: 0, 3: 0 }
  const N = 5000
  for (let i = 0; i < N; i++) {
    const e = hs.rollWildEncounter([3, 1, 2]) // 순서가 섞여 와도 낮은 tier 기준
    count[ZONES.find(z => z.id === e.zoneId).tier]++
  }
  assert.ok(Math.abs(count[1] / N - 0.6) < 0.05)
  assert.ok(Math.abs(count[2] / N - 0.3) < 0.05)
  assert.ok(Math.abs(count[3] / N - 0.1) < 0.05)
})
