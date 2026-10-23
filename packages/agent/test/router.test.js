const { test } = require('node:test')
const assert = require('node:assert/strict')
const { routeRequest, loadAgentConfig } = require('../dist')
const requests = require('./fixtures/requests.json')

const config = loadAgentConfig()

const rules = {
  ...config,
  defaultModel: 'large',
  routing: {
    ...config.routing,
    chatModel: 'small',
    baseTools: ['base'],
    tools: {
      base:  { keywords: ['기본'] },
      look:  { keywords: ['상태'] },
      act:   { keywords: ['사냥 가'], requires: ['find'] },
      find:  { keywords: ['어디서'], requires: ['look'] },
    },
  },
}

test('키워드가 없으면 잡담 — 잡담 모델, tool 없음', () => {
  const r = routeRequest('안녕 반가워', rules)
  assert.deepEqual({ kind: r.kind, modelName: r.modelName, tools: r.tools }, { kind: 'chat', modelName: 'small', tools: [] })
})

test('키워드가 있으면 tool 경로 — 기본 모델, 기본 tool + 걸린 tool', () => {
  const r = routeRequest('상태 알려줘', rules)
  assert.equal(r.kind, 'tools')
  assert.equal(r.modelName, 'large')
  assert.deepEqual(r.tools, ['base', 'look'])
  assert.deepEqual(r.matched, ['look'])
})

test('의존 tool은 이어서 따라 넣고, 순서는 설정 순서', () => {
  assert.deepEqual(routeRequest('사냥 가자', rules).tools, ['base', 'look', 'act', 'find'])
})

test('띄어쓰기가 달라도 같은 키워드로 본다', () => {
  assert.deepEqual(routeRequest('사냥가자', rules).matched, ['act'])
  assert.deepEqual(routeRequest('사 냥 가', rules).matched, ['act'])
})

test('reason — 걸린 tool과 키워드를 로그용으로 남김', () => {
  assert.equal(routeRequest('상태 보고 사냥 가', rules).reason, 'keyword look(상태), act(사냥 가)')
  assert.equal(routeRequest('안녕', rules).reason, 'no_tool_keyword')
})

test('고정 요청 세트 20개 — 기본 설정으로 기대한 경로·tool', () => {
  for (const { message, expect, tools = [] } of requests) {
    const r = routeRequest(message, config)
    assert.equal(r.kind, expect, message)
    for (const t of tools) assert.ok(r.tools.includes(t), `${message} → ${t} (got ${r.tools})`)
    if (expect === 'chat') assert.equal(r.modelName, config.routing.chatModel, message)
    else assert.equal(r.modelName, config.defaultModel, message)
  }
})
