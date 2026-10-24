const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createConversationMemory } = require('../dist')

test('처음엔 비어 있음', () => {
  const m = createConversationMemory({ maxTurns: 2 })
  assert.deepEqual(m.toMessages(), [])
  assert.deepEqual(m.stats(), { turns: 0, summarized: 0 })
})

test('최근 턴은 user·assistant 원문 그대로', () => {
  const m = createConversationMemory({ maxTurns: 2 })
  m.add('안녕', '안녕하세요')
  m.add('밥 줘', '사료를 줬어요')
  assert.deepEqual(m.toMessages(), [
    { role: 'user', content: '안녕' }, { role: 'assistant', content: '안녕하세요' },
    { role: 'user', content: '밥 줘' }, { role: 'assistant', content: '사료를 줬어요' },
  ])
})

test('maxTurns를 넘은 오래된 턴은 맨 앞 요약 한 줄로 바뀜', () => {
  const m = createConversationMemory({ maxTurns: 2 })
  m.add('첫 질문', '첫 답')
  m.add('둘째 질문', '둘째 답')
  m.add('셋째 질문', '셋째 답')
  const msgs = m.toMessages()
  assert.equal(msgs.length, 1 + 4)
  assert.equal(msgs[0].role, 'system')
  assert.match(msgs[0].content, /이전 대화 요약/)
  assert.match(msgs[0].content, /사용자: 첫 질문 → 도우미: 첫 답/)
  assert.deepEqual(msgs[1], { role: 'user', content: '둘째 질문' })
  assert.deepEqual(m.stats(), { turns: 3, summarized: 1 })
})

test('요약 줄 — 사용자 40자·도우미 60자를 넘으면 자르고 …', () => {
  const m = createConversationMemory({ maxTurns: 1 })
  m.add('가'.repeat(100), '나'.repeat(100))
  m.add('q2', 'a2')
  const summary = m.toMessages()[0].content
  assert.match(summary, new RegExp(`사용자: 가{40}… → 도우미: 나{60}…`))
})

test('요약 줄 수 상한 — 넘으면 가장 오래된 줄부터 버림', () => {
  const m = createConversationMemory({ maxTurns: 1, maxSummaryLines: 2 })
  for (const n of [1, 2, 3, 4]) m.add(`q${n}`, `a${n}`)
  const summary = m.toMessages()[0].content
  assert.doesNotMatch(summary, /q1/)
  assert.match(summary, /q2/)
  assert.match(summary, /q3/)
  assert.deepEqual(m.stats(), { turns: 4, summarized: 2 })
})

test('clear — 기록을 모두 지움', () => {
  const m = createConversationMemory({ maxTurns: 2 })
  m.add('a', 'b')
  m.clear()
  assert.deepEqual(m.toMessages(), [])
})

// ---- LLM 요약 job (게이트웨이 큐) ----

test('summaryRequest — 밀려난 턴이 없으면 null', () => {
  const m = createConversationMemory({ maxTurns: 2 })
  m.add('a', 'b')
  assert.equal(m.summaryRequest(), null)
})

test('summaryRequest — 밀려난 턴과 이전 요약(처음엔 null)', () => {
  const m = createConversationMemory({ maxTurns: 1 })
  m.add('q1', 'a1')
  m.add('q2', 'a2')
  m.add('q3', 'a3')
  assert.deepEqual(m.summaryRequest(), { previous: null, turns: [{ user: 'q1', reply: 'a1' }, { user: 'q2', reply: 'a2' }], upTo: 2 })
})

test('applySummary — LLM 요약이 그 턴들의 규칙 요약 줄을 대신함', () => {
  const m = createConversationMemory({ maxTurns: 1 })
  m.add('q1', 'a1')
  m.add('q2', 'a2')
  m.add('q3', 'a3')
  m.applySummary('불꽃이에게 밥을 줬다', 2)
  const msgs = m.toMessages()
  assert.equal(msgs[0].content, '이전 대화 요약:\n불꽃이에게 밥을 줬다')
  assert.deepEqual(msgs.slice(1), [{ role: 'user', content: 'q3' }, { role: 'assistant', content: 'a3' }])
  assert.deepEqual(m.stats(), { turns: 3, summarized: 0, llmSummary: true })
  assert.equal(m.summaryRequest(), null)
})

test('applySummary 뒤 새로 밀려난 턴은 규칙 줄로 이어 붙고, 다음 요청엔 이전 요약이 들어감', () => {
  const m = createConversationMemory({ maxTurns: 1 })
  m.add('q1', 'a1')
  m.add('q2', 'a2')
  const req = m.summaryRequest()
  m.add('q3', 'a3') // job이 도는 동안 q2가 밀려남
  m.applySummary('요약1', req.upTo)
  assert.match(m.toMessages()[0].content, /^이전 대화 요약:\n요약1\n- 사용자: q2 → 도우미: a2$/)
  assert.deepEqual(m.summaryRequest(), { previous: '요약1', turns: [{ user: 'q2', reply: 'a2' }], upTo: 2 })
})

test('밀려난 턴은 maxPendingTurns까지만 들고 있음', () => {
  const m = createConversationMemory({ maxTurns: 1, maxPendingTurns: 2 })
  for (const n of [1, 2, 3, 4]) m.add(`q${n}`, `a${n}`)
  assert.deepEqual(m.summaryRequest().turns.map(t => t.user), ['q2', 'q3'])
})

test('clear 뒤에 도착한 예전 요약은 버림', () => {
  const m = createConversationMemory({ maxTurns: 1 })
  m.add('q1', 'a1')
  m.add('q2', 'a2')
  const req = m.summaryRequest()
  m.clear()
  m.applySummary('지난 대화 요약', req.upTo)
  assert.deepEqual(m.toMessages(), [])
  assert.deepEqual(m.stats(), { turns: 0, summarized: 0 })
})
