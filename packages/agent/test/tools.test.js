const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateArgs, toToolSpec } = require('../dist')

const schema = {
  type: 'object',
  properties: {
    petId:  { type: 'integer', minimum: 1 },
    zoneId: { type: 'string' },
    mode:   { type: 'string', enum: ['auto', 'manual'] },
  },
  required: ['petId'],
}

test('정상 인자 통과', () => {
  assert.deepEqual(validateArgs(schema, '{"petId":3,"zoneId":"forest","mode":"auto"}'), { ok: true, args: { petId: 3, zoneId: 'forest', mode: 'auto' } })
})

test('빈 문자열은 빈 객체로 — 필수값이 없으면 실패', () => {
  assert.deepEqual(validateArgs({ type: 'object', properties: {}, required: [] }, ''), { ok: true, args: {} })
  assert.equal(validateArgs(schema, '').ok, false)
})

test('JSON이 아니거나 객체가 아니면 실패', () => {
  assert.match(validateArgs(schema, '{petId:1').error, /JSON/)
  assert.match(validateArgs(schema, '[1]').error, /객체/)
})

test('필수값 누락', () => {
  assert.match(validateArgs(schema, '{"zoneId":"x"}').error, /petId/)
})

test('정의에 없는 필드는 거부', () => {
  assert.match(validateArgs(schema, '{"petId":1,"coins":999}').error, /coins/)
})

test('integer — 소수·문자·최솟값 미만 거부, 숫자 문자열은 정수로 변환', () => {
  assert.equal(validateArgs(schema, '{"petId":1.5}').ok, false)
  assert.equal(validateArgs(schema, '{"petId":"abc"}').ok, false)
  assert.equal(validateArgs(schema, '{"petId":0}').ok, false)
  assert.deepEqual(validateArgs(schema, '{"petId":"7"}'), { ok: true, args: { petId: 7 } })
})

test('string — 타입·enum 검사', () => {
  assert.match(validateArgs(schema, '{"petId":1,"zoneId":5}').error, /zoneId/)
  assert.match(validateArgs(schema, '{"petId":1,"mode":"fly"}').error, /mode/)
})

test('toToolSpec — OpenAI tools 형식', () => {
  const spec = toToolSpec({ name: 'get_party', description: '파티 조회', parameters: schema, run: () => null })
  assert.deepEqual(spec, { type: 'function', function: { name: 'get_party', description: '파티 조회', parameters: schema } })
})
