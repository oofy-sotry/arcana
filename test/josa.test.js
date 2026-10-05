const { test } = require('node:test')
const assert = require('node:assert/strict')
const Josa = require('../src/renderer/shared/Josa')

test('attach — 받침 있으면 은/이/을/과, 없으면 는/가/를/와', () => {
  assert.equal(Josa.attach('이그나', '은'), '이그나는')
  assert.equal(Josa.attach('잿빛 군주', '을'), '잿빛 군주를')
  assert.equal(Josa.attach('화염 슬라임', '이'), '화염 슬라임이')
  assert.equal(Josa.attach('물방울', '는'), '물방울은')
  assert.equal(Josa.attach('친구', '와'), '친구와')
  assert.equal(Josa.attach('관장', '와'), '관장과')
})

test('attach — 으로/로는 받침 없거나 ㄹ이면 로', () => {
  assert.equal(Josa.attach('마을', '으로'), '마을로')
  assert.equal(Josa.attach('회복소', '으로'), '회복소로')
  assert.equal(Josa.attach('체육관', '로'), '체육관으로')
})

test('attach — 숫자는 읽는 소리로, 끝 문장부호는 무시', () => {
  assert.equal(Josa.attach('불꽃 배지 1단계', '을'), '불꽃 배지 1단계를')
  assert.equal(Josa.attach('레벨 3', '이'), '레벨 3이')
  assert.equal(Josa.attach('레벨 2', '이'), '레벨 2가')
  assert.equal(Josa.attach('물방울!', '은'), '물방울!은')
})

test('attach — 영문 등 판단 불가면 병기', () => {
  assert.equal(Josa.attach('Bob', '은'), 'Bob은(는)')
  assert.equal(Josa.attach('', '을'), '을(를)')
})
