const { test } = require('node:test')
const assert = require('node:assert/strict')
const PixelSprite = require('../src/renderer/shared/PixelSprite')

test('grid — 같은 시드면 항상 같은 모양', () => {
  const a = PixelSprite.grid({ seed: 'fire_1_a', attribute: 'fire' })
  const b = PixelSprite.grid({ seed: 'fire_1_a', attribute: 'fire' })
  assert.deepEqual(a, b)
})

test('grid — 시드가 다르면 모양이 달라짐', () => {
  const a = PixelSprite.grid({ seed: 'fire_1_a', attribute: 'fire' })
  const b = PixelSprite.grid({ seed: 'fire_1_b', attribute: 'fire' })
  assert.notDeepEqual(a, b)
})

test('grid — 14×14(12×12 + 외곽선 여백), 좌우 대칭', () => {
  for (const kind of ['monster', 'pet']) {
    const g = PixelSprite.grid({ seed: 'x', attribute: 'water', kind })
    assert.equal(g.length, 14)
    g.forEach(row => {
      assert.equal(row.length, 14)
      assert.deepEqual(row, [...row].reverse())
    })
  }
})

test('grid — 보스는 머리 위 금색 표시가 추가됨', () => {
  const normal = PixelSprite.grid({ seed: 's', attribute: 'ice' })
  const boss   = PixelSprite.grid({ seed: 's', attribute: 'ice', isBoss: true })
  assert.ok(!normal[0].includes('#ffd700'))
  assert.ok(boss[0].includes('#ffd700'))
})
