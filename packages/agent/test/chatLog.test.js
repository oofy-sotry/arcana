const { test } = require('node:test')
const assert = require('node:assert/strict')
const { formatChatLog } = require('../dist')

const ok = {
  ok: true, reply: '…', model: 'gemini-x', steps: 3, toolCalls: 2, stoppedBy: 'answer',
  usage: { promptTokens: 1200, completionTokens: 40 }, firstTokenMs: 812,
  route: { kind: 'tools', modelName: 'large', tools: ['get_pets', 'use_item'], reason: 'keyword use_item(밥)' },
  context: { chars: 245, parts: ['pets', 'inventory'] }, history: { turns: 3, summarized: 1 }, retries: 0,
}

test('성공 — 경로·모델·tool·컨텍스트·기록·토큰·단계·시간을 한 줄로', () => {
  assert.equal(formatChatLog(ok, 1530),
    'ok route=tools model=gemini-x tools=get_pets,use_item context=245자(pets+inventory) history=3턴(요약1) tokens=1200/40 steps=3 toolCalls=2 first=812ms total=1530ms reason="keyword use_item(밥)"')
})

test('넘긴 경우·재시도는 덧붙임, tool 없으면 -', () => {
  const line = formatChatLog({
    ...ok, toolCalls: 0, steps: 1, firstTokenMs: undefined, retries: 1,
    route: { kind: 'chat', modelName: 'large', tools: [], reason: 'no_tool_keyword', fallback: 'no_chat_model' },
  }, 900)
  assert.match(line, /route=chat model=gemini-x tools=- /)
  assert.match(line, / first=- /)
  assert.match(line, / fallback=no_chat_model retries=1 /)
})

test('실패 — 이유와 오류만', () => {
  assert.equal(formatChatLog({ ok: false, reason: 'rate_limited', error: 'too many' }, 50), 'fail reason=rate_limited total=50ms error="too many"')
})
