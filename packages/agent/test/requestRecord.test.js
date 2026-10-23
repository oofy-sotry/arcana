const { test } = require('node:test')
const assert = require('node:assert/strict')
const { toRequestRecord } = require('../dist')

const ok = {
  ok: true, reply: '…', model: 'gemini-x', steps: 4, toolCalls: 3, stoppedBy: 'answer',
  usage: { promptTokens: 3380, completionTokens: 111 }, firstTokenMs: 622,
  route: { kind: 'tools', modelName: 'large', tools: ['get_pets', 'use_item'], reason: 'r', fallback: 'chat_model_failed' },
  context: { chars: 133, parts: ['pets', 'inventory'] }, history: { turns: 1, summarized: 0 }, retries: 1,
  costUsd: 0.0010116, totalMs: 2835,
}

test('성공 — 요청 기록 한 줄(모델·토큰·첫 토큰·전체 시간·비용·tool 수·성공·경로·컨텍스트)', () => {
  assert.deepEqual(toRequestRecord(ok, { createdAt: 1700000000000, totalMs: 2900 }), {
    created_at: 1700000000000, ok: 1, fail_reason: null,
    route: 'tools', model_name: 'large', model: 'gemini-x', tool_count: 2, fallback: 'chat_model_failed', retries: 1,
    prompt_tokens: 3380, completion_tokens: 111, first_token_ms: 622, total_ms: 2900,
    cost_usd: 0.0010116, tool_calls: 3, steps: 4, stopped_by: 'answer', context_chars: 133, history_turns: 1,
  })
})

test('첫 토큰·넘김·비용이 없으면 null', () => {
  const rec = toRequestRecord({ ...ok, firstTokenMs: undefined, costUsd: null, route: { ...ok.route, fallback: undefined } }, { createdAt: 1, totalMs: 5 })
  assert.equal(rec.first_token_ms, null)
  assert.equal(rec.fallback, null)
  assert.equal(rec.cost_usd, null)
})

test('실패 — 성공 0과 실패 이유, 모델·토큰 칸은 null', () => {
  const rec = toRequestRecord({ ok: false, reason: 'rate_limited', error: 'too many' }, { createdAt: 2, totalMs: 40 })
  assert.equal(rec.ok, 0)
  assert.equal(rec.fail_reason, 'rate_limited')
  assert.equal(rec.total_ms, 40)
  for (const k of ['route', 'model_name', 'model', 'prompt_tokens', 'completion_tokens', 'cost_usd', 'tool_calls']) assert.equal(rec[k], null, k)
})

test('기록에는 메시지·답 원문이나 오류 문장을 넣지 않음', () => {
  const rec = toRequestRecord({ ...ok, reply: '비밀 답' }, { createdAt: 1, totalMs: 1 })
  assert.ok(!JSON.stringify(rec).includes('비밀 답'))
  assert.ok(!JSON.stringify(toRequestRecord({ ok: false, reason: 'error', error: 'key=abc' }, { createdAt: 1, totalMs: 1 })).includes('abc'))
})
