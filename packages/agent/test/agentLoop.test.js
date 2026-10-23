const { test } = require('node:test')
const assert = require('node:assert/strict')
const { runAgent } = require('../dist')

// 미리 정한 응답을 차례로 돌려주는 가짜 클라이언트. 받은 요청은 requests에 남는다
function scriptedClient(responses) {
  const requests = []
  return {
    requests,
    ping: async () => true,
    chat: async req => {
      requests.push(structuredClone({ messages: req.messages, tools: req.tools }))
      const r = responses.shift()
      if (!r) throw new Error('응답이 더 없음')
      if (r.content) req.onToken?.(r.content)
      return { content: r.content ?? '', toolCalls: r.toolCalls ?? [], usage: r.usage, totalMs: 1 }
    },
  }
}

const call = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } })

function makeTools(log) {
  return [
    {
      name: 'get_pet',
      description: '펫 조회',
      parameters: { type: 'object', properties: { petId: { type: 'integer', minimum: 1 } }, required: ['petId'] },
      check: ({ petId }) => (petId === 1 ? null : '내 펫이 아닙니다'),
      run: ({ petId }) => { log.push(['get_pet', petId]); return { id: petId, hunger: 20 } },
    },
    {
      name: 'feed',
      description: '먹이',
      parameters: { type: 'object', properties: { petId: { type: 'integer' } }, required: ['petId'] },
      run: ({ petId }) => { log.push(['feed', petId]); return { ok: true } },
    },
    {
      name: 'boom',
      description: '항상 실패',
      parameters: { type: 'object', properties: {}, required: [] },
      run: () => { throw new Error('DB 오류') },
    },
  ]
}

const base = { model: 'm', maxSteps: 5, maxStepsReply: '머리가 복잡해요…', messages: [{ role: 'user', content: '배고파?' }] }

test('tool 없이 바로 답하면 1단계로 끝', async () => {
  const client = scriptedClient([{ content: '괜찮아요!', usage: { promptTokens: 10, completionTokens: 2 } }])
  const tokens = []
  const res = await runAgent({ ...base, client, tools: makeTools([]), onToken: t => tokens.push(t) })
  assert.equal(res.reply, '괜찮아요!')
  assert.equal(res.steps, 1)
  assert.equal(res.toolCalls, 0)
  assert.equal(res.stoppedBy, 'answer')
  assert.deepEqual(res.usage, { promptTokens: 10, completionTokens: 2 })
  assert.deepEqual(tokens, ['괜찮아요!'])
})

test('tool 여러 번 → 결과를 tool 메시지로 넘기고 최종 답, usage 합산', async () => {
  const log = []
  const client = scriptedClient([
    { toolCalls: [call('a', 'get_pet', { petId: 1 })], usage: { promptTokens: 10, completionTokens: 5 } },
    { toolCalls: [call('b', 'feed', { petId: 1 })], usage: { promptTokens: 20, completionTokens: 5 } },
    { content: '밥 먹었어요!', usage: { promptTokens: 30, completionTokens: 4 } },
  ])
  const res = await runAgent({ ...base, client, tools: makeTools(log) })
  assert.deepEqual(log, [['get_pet', 1], ['feed', 1]])
  assert.equal(res.steps, 3)
  assert.equal(res.toolCalls, 2)
  assert.deepEqual(res.usage, { promptTokens: 60, completionTokens: 14 })

  const second = client.requests[1].messages
  assert.equal(second.at(-2).role, 'assistant')
  assert.equal(second.at(-2).tool_calls[0].id, 'a')
  assert.equal(second.at(-1).role, 'tool')
  assert.equal(second.at(-1).tool_call_id, 'a')
  assert.deepEqual(JSON.parse(second.at(-1).content), { id: 1, hunger: 20 })
  assert.equal(client.requests[0].tools.length, 3)
})

test('검증 실패·check 실패·없는 tool·실행 예외는 실행 없이 error 결과로 모델에 전달', async () => {
  const log = []
  const client = scriptedClient([
    { toolCalls: [
      call('a', 'get_pet', { petId: 'x' }),
      call('b', 'get_pet', { petId: 2 }),
      call('c', 'hack_coins', {}),
      call('d', 'boom', {}),
    ] },
    { content: '잘 안 됐어요' },
  ])
  const res = await runAgent({ ...base, client, tools: makeTools(log) })
  assert.deepEqual(log, [])
  const toolMsgs = client.requests[1].messages.filter(m => m.role === 'tool').map(m => JSON.parse(m.content))
  assert.equal(toolMsgs.length, 4)
  assert.match(toolMsgs[0].error, /petId/)
  assert.match(toolMsgs[1].error, /내 펫이 아닙니다/)
  assert.match(toolMsgs[2].error, /hack_coins/)
  assert.match(toolMsgs[3].error, /DB 오류/)
  assert.equal(res.toolCalls, 4)
  assert.equal(res.reply, '잘 안 됐어요')
})

test('단계 상한 — maxSteps번 호출해도 끝나지 않으면 멈추고 정해진 문구', async () => {
  const loop = Array.from({ length: 10 }, (_, i) => ({ toolCalls: [call(`c${i}`, 'feed', { petId: 1 })] }))
  const client = scriptedClient(loop)
  const log = []
  const res = await runAgent({ ...base, maxSteps: 3, client, tools: makeTools(log) })
  assert.equal(client.requests.length, 3)
  assert.equal(res.steps, 3)
  assert.equal(res.stoppedBy, 'max_steps')
  assert.equal(res.reply, '머리가 복잡해요…')
  assert.equal(log.length, 3)
})

test('onToolCall — 이름·인자·결과 알림 (renderer 진행 표시용)', async () => {
  const seen = []
  const client = scriptedClient([{ toolCalls: [call('a', 'feed', { petId: 1 })] }, { content: '끝' }])
  await runAgent({ ...base, client, tools: makeTools([]), onToolCall: e => seen.push(e) })
  assert.deepEqual(seen, [{ name: 'feed', args: { petId: 1 }, result: { ok: true }, ok: true }])
})

test('넘겨받은 messages 배열은 바꾸지 않음', async () => {
  const messages = [{ role: 'user', content: '배고파?' }]
  const client = scriptedClient([{ toolCalls: [call('a', 'feed', { petId: 1 })] }, { content: '끝' }])
  await runAgent({ ...base, messages, client, tools: makeTools([]) })
  assert.equal(messages.length, 1)
})
