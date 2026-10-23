const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createChatClient, LlmError } = require('../dist')

// SSE 청크 배열을 스트림 응답으로 돌려주는 가짜 fetch. 마지막 요청은 calls에 남는다
function fakeFetch(chunks, { status = 200 } = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) })
    const enc = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(enc.encode(c))
        controller.close()
      },
    })
    return new Response(stream, { status })
  }
  return { fetchImpl, calls }
}

const sse = obj => `data: ${JSON.stringify(obj)}\n\n`
const delta = d => sse({ choices: [{ index: 0, delta: d }] })

test('요청 — baseURL/chat/completions, 모델·스트리밍·tool 포함, Bearer 키', async () => {
  const { fetchImpl, calls } = fakeFetch([delta({ content: 'hi' }), 'data: [DONE]\n\n'])
  const client = createChatClient({ baseURL: 'http://x/v1', apiKey: 'k', fetchImpl })
  const tools = [{ type: 'function', function: { name: 't', description: 'd', parameters: { type: 'object', properties: {} } } }]
  await client.chat({ model: 'm', messages: [{ role: 'user', content: 'a' }], tools })
  assert.equal(calls[0].url, 'http://x/v1/chat/completions')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer k')
  assert.equal(calls[0].body.model, 'm')
  assert.equal(calls[0].body.stream, true)
  assert.deepEqual(calls[0].body.tools, tools)
})

test('키가 없으면 Authorization 헤더 없음, tool이 없으면 tools 필드 없음', async () => {
  const { fetchImpl, calls } = fakeFetch(['data: [DONE]\n\n'])
  await createChatClient({ baseURL: 'http://x/v1', fetchImpl }).chat({ model: 'm', messages: [] })
  assert.equal(calls[0].init.headers.Authorization, undefined)
  assert.equal('tools' in calls[0].body, false)
})

test('스트리밍 — 토큰마다 onToken, 청크가 줄 중간에서 끊겨도 합쳐서 처리', async () => {
  const whole = delta({ content: '안녕' }) + delta({ content: '하세요' }) + 'data: [DONE]\n\n'
  const { fetchImpl } = fakeFetch([whole.slice(0, 17), whole.slice(17, 40), whole.slice(40)])
  const tokens = []
  const res = await createChatClient({ baseURL: 'http://x', fetchImpl })
    .chat({ model: 'm', messages: [], onToken: t => tokens.push(t) })
  assert.deepEqual(tokens, ['안녕', '하세요'])
  assert.equal(res.content, '안녕하세요')
  assert.deepEqual(res.toolCalls, [])
})

test('tool 호출 — index별로 이름·인자 조각을 이어 붙임', async () => {
  const { fetchImpl } = fakeFetch([
    delta({ tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'use_item', arguments: '{"petId"' } }] }),
    delta({ tool_calls: [{ index: 0, function: { arguments: ':1}' } }] }),
    delta({ tool_calls: [{ index: 1, id: 'c2', type: 'function', function: { name: 'get_party', arguments: '{}' } }] }),
    'data: [DONE]\n\n',
  ])
  const res = await createChatClient({ baseURL: 'http://x', fetchImpl }).chat({ model: 'm', messages: [] })
  assert.deepEqual(res.toolCalls, [
    { id: 'c1', type: 'function', function: { name: 'use_item', arguments: '{"petId":1}' } },
    { id: 'c2', type: 'function', function: { name: 'get_party', arguments: '{}' } },
  ])
})

test('usage — 마지막 청크의 토큰 수, 첫 토큰·전체 시간 기록', async () => {
  const { fetchImpl } = fakeFetch([
    delta({ content: 'a' }),
    sse({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 3 } }),
    'data: [DONE]\n\n',
  ])
  let t = 1000
  const res = await createChatClient({ baseURL: 'http://x', fetchImpl, now: () => (t += 10) })
    .chat({ model: 'm', messages: [] })
  assert.deepEqual(res.usage, { promptTokens: 12, completionTokens: 3 })
  assert.equal(typeof res.firstTokenMs, 'number')
  assert.ok(res.totalMs >= res.firstTokenMs)
})

test('HTTP 오류 — status를 담은 LlmError (429 무료 한도 구분용)', async () => {
  const { fetchImpl } = fakeFetch(['{"error":"rate limited"}'], { status: 429 })
  await assert.rejects(
    createChatClient({ baseURL: 'http://x', fetchImpl }).chat({ model: 'm', messages: [] }),
    err => err instanceof LlmError && err.status === 429 && /rate limited/.test(err.message),
  )
})

test('연결 실패 — status 없는 LlmError(unreachable)', async () => {
  const fetchImpl = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(
    createChatClient({ baseURL: 'http://x', fetchImpl }).chat({ model: 'm', messages: [] }),
    err => err instanceof LlmError && err.status === undefined && err.code === 'unreachable',
  )
})

test('ping — /models 응답이 성공이면 true, 실패·연결 불가면 false', async () => {
  const ok  = createChatClient({ baseURL: 'http://x', fetchImpl: async () => new Response('{}', { status: 200 }) })
  const bad = createChatClient({ baseURL: 'http://x', fetchImpl: async () => new Response('', { status: 401 }) })
  const off = createChatClient({ baseURL: 'http://x', fetchImpl: async () => { throw new TypeError('fetch failed') } })
  assert.equal(await ok.ping(), true)
  assert.equal(await bad.ping(), false)
  assert.equal(await off.ping(), false)
})
