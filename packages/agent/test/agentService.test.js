const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createAgentService, LlmError, MAX_MESSAGE_LENGTH } = require('../dist')

const ALL_TOOLS = ['get_pets', 'get_inventory', 'use_item', 'get_hunting_zones', 'start_auto_hunt', 'get_party']

const config = {
  maxSteps: 3,
  defaultModel: 'large',
  providers: {
    local:  { baseURL: 'http://local/v1' },
    remote: { baseURL: 'http://remote/v1', apiKeyEnv: 'REMOTE_KEY', apiKeySecret: 'remoteKey' },
  },
  models: {
    small: { provider: 'local', model: 'tiny' },
    large: { provider: 'remote', model: 'big' },
  },
  routing: {
    chatModel: 'small',
    baseTools: ['get_pets'],
    tools: {
      get_pets:          { keywords: ['상태'] },
      get_inventory:     { keywords: ['가방'] },
      use_item:          { keywords: ['밥'], requires: ['get_inventory'] },
      get_hunting_zones: { keywords: ['사냥터'] },
      start_auto_hunt:   { keywords: ['사냥 가'], requires: ['get_hunting_zones'] },
      get_party:         { keywords: ['파티'] },
    },
    chatTimeoutMs: 1000,
    retryDelayMs:  0,
    historyTurns:  2,
    contextMaxPets: 6,
  },
  pricing: { note: 't', models: { small: { inputPer1M: 0, outputPer1M: 0 }, large: { inputPer1M: 1, outputPer1M: 2 } } },
}

const game = {
  getPets: () => [{ id: 1, name: '불꽃이', attribute: 'fire', level: 3, is_fainted: 0, conditions: { hunger: 20, happiness: 90, cleanliness: 70, energy: 100 } }],
  getInventory: () => [{ item_id: 'pet_food', quantity: 2, data: { name: '펫 사료', type: 'consumable', effect: 'hunger_restore' } }],
  useItem: () => ({ ok: true }),
  getZones: () => [],
  startAutoHunt: () => ({ battles: [], finalEnergy: 0 }),
  getParty: () => ({ members: [], synergy: null }),
}

// 모델(tiny·big)별로 응답을 차례로 돌려주는 가짜 클라이언트. 함수 응답은 요청을 받아 직접 처리
function fakeClientFactory({ ping = {}, responses = {} } = {}) {
  const made = []
  const requests = []
  const createClient = opts => {
    made.push(opts)
    return {
      ping: async () => ping[opts.baseURL] ?? true,
      chat: async req => {
        // 루프가 같은 messages 배열에 이어 붙이므로 요청 시점 내용을 복사해 둔다
        requests.push({ ...req, messages: structuredClone(req.messages) })
        const r = (responses[req.model] ?? []).shift()
        if (typeof r === 'function') return r(req)
        if (r instanceof Error) throw r
        if (r?.content) req.onToken?.(r.content)
        return { content: r?.content ?? '', toolCalls: r?.toolCalls ?? [], usage: r?.usage, firstTokenMs: 5, totalMs: 9 }
      },
    }
  }
  return { createClient, made, requests }
}

const make = (factory = fakeClientFactory(), overrides = {}) =>
  createAgentService({ config, secrets: { remoteKey: 'k' }, env: {}, game, createClient: factory.createClient, ...overrides })

const toolNames = req => (req.tools ?? []).map(t => t.function.name)

// ── 켜짐·꺼짐 ────────────────────────────────────────────────────────────

test('init — 큰 모델·잡담 모델 둘 다 연결되면 켜짐', async () => {
  const factory = fakeClientFactory()
  const status = await make(factory).init()
  assert.deepEqual(status, { enabled: true, model: 'big', chatModel: 'tiny' })
  assert.deepEqual(factory.made, [{ baseURL: 'http://remote/v1', apiKey: 'k' }, { baseURL: 'http://local/v1', apiKey: undefined }])
})

test('init — 잡담 모델에 연결할 수 없어도 켜짐, chatModel=null', async () => {
  const status = await make(fakeClientFactory({ ping: { 'http://local/v1': false } })).init()
  assert.deepEqual(status, { enabled: true, model: 'big', chatModel: null })
})

test('init — 큰 모델 키가 없으면 꺼짐(no_key), 공급자를 부르지 않음', async () => {
  const factory = fakeClientFactory()
  const status = await make(factory, { secrets: {} }).init()
  assert.equal(status.enabled, false)
  assert.equal(status.reason, 'no_key')
  assert.equal(factory.made.length, 0)
})

test('init — 큰 모델에 연결할 수 없으면 꺼짐(unreachable)', async () => {
  const status = await make(fakeClientFactory({ ping: { 'http://remote/v1': false } })).init()
  assert.deepEqual(status, { enabled: false, model: 'big', reason: 'unreachable' })
})

test('init — 설정이 잘못돼도 예외 대신 꺼짐(bad_config)', async () => {
  const status = await make(undefined, { config: { ...config, defaultModel: 'huge' } }).init()
  assert.equal(status.enabled, false)
  assert.equal(status.reason, 'bad_config')
})

test('status — init 전에는 꺼짐(not_ready)', () => {
  assert.deepEqual(make().status(), { enabled: false, reason: 'not_ready' })
})

test('chat — 꺼져 있으면 모델을 부르지 않고 실패 결과', async () => {
  const factory = fakeClientFactory({ ping: { 'http://remote/v1': false } })
  const service = make(factory)
  await service.init()
  assert.equal((await service.chat('안녕')).reason, 'disabled')
  assert.equal(factory.requests.length, 0)
})

test('chat — 빈 문자열·문자열 아님·너무 긴 입력은 실행 전에 거절', async () => {
  const factory = fakeClientFactory()
  const service = make(factory)
  await service.init()
  for (const bad of ['', '   ', 42, null, 'a'.repeat(MAX_MESSAGE_LENGTH + 1)]) {
    assert.equal((await service.chat(bad)).reason, 'invalid_input', String(bad).slice(0, 10))
  }
  assert.equal(factory.requests.length, 0)
})

// ── 라우팅·컨텍스트 ──────────────────────────────────────────────────────

test('잡담 — 작은 모델, tool 없이, 펫 이름만 짧게 넣음', async () => {
  const factory = fakeClientFactory({ responses: { tiny: [{ content: '안녕하세요!' }] } })
  const service = make(factory)
  await service.init()
  const res = await service.chat('안녕')
  assert.equal(res.ok, true)
  assert.equal(res.model, 'tiny')
  assert.equal(res.reply, '안녕하세요!')
  assert.deepEqual(res.route, { kind: 'chat', modelName: 'small', tools: [], reason: 'no_tool_keyword' })
  assert.deepEqual(res.context.parts, ['pets_brief'])
  const req = factory.requests[0]
  assert.equal(req.model, 'tiny')
  assert.deepEqual(toolNames(req), [])
  assert.match(req.messages[0].content, /내 펫: 불꽃이\(Lv3\)/)
  assert.deepEqual(req.messages.at(-1), { role: 'user', content: '안녕' })
})

test('tool 요청 — 큰 모델에 고른 tool만, 펫 상태 수치를 컨텍스트로', async () => {
  const factory = fakeClientFactory({ responses: { big: [{ content: '건강해요', usage: { promptTokens: 10, completionTokens: 4 } }] } })
  const service = make(factory)
  await service.init()
  const res = await service.chat('  불꽃이 상태 어때?  ')
  assert.equal(res.model, 'big')
  assert.equal(res.route.kind, 'tools')
  assert.deepEqual(res.route.tools, ['get_pets'])
  assert.deepEqual(res.usage, { promptTokens: 10, completionTokens: 4 })
  assert.ok(res.context.chars > 0)
  const req = factory.requests[0]
  assert.deepEqual(toolNames(req), ['get_pets'])
  assert.match(req.messages[0].content, /id 1 불꽃이 Lv3 fire 배고픔 20/)
  assert.deepEqual(req.messages.at(-1), { role: 'user', content: '불꽃이 상태 어때?' })
})

test('아이템 요청 — 가방 tool과 가방 요약까지', async () => {
  const factory = fakeClientFactory({ responses: { big: [{ content: '줬어요' }] } })
  const service = make(factory)
  await service.init()
  const res = await service.chat('밥 줘')
  assert.deepEqual(res.route.tools, ['get_pets', 'get_inventory', 'use_item'])
  assert.deepEqual(res.context.parts, ['pets', 'inventory'])
  assert.match(factory.requests[0].messages[0].content, /pet_food 펫 사료 x2/)
})

test('시스템 프롬프트 — tool 경로도 잡담도 마크다운 없는 평문 요구', async () => {
  const factory = fakeClientFactory({ responses: { tiny: [{ content: 'a' }], big: [{ content: 'b' }] } })
  const service = make(factory)
  await service.init()
  await service.chat('안녕')
  await service.chat('상태')
  for (const req of factory.requests) assert.match(req.messages[0].content, /마크다운/)
})

// ── 잘못 라우팅·실패 시 넘기기 ───────────────────────────────────────────

test('잡담 모델이 NEED_TOOLS로 답하면 tool 전체를 주고 큰 모델로 다시 — 표시는 흘리지 않음', async () => {
  const factory = fakeClientFactory({ responses: { tiny: [{ content: 'NEED_TOOLS' }], big: [{ content: '먹였어요' }] } })
  const service = make(factory)
  await service.init()
  const tokens = []
  const res = await service.chat('불꽃이 좀 챙겨줘', { onToken: t => tokens.push(t) })
  assert.equal(res.model, 'big')
  assert.equal(res.reply, '먹였어요')
  assert.equal(res.route.kind, 'tools')
  assert.equal(res.route.fallback, 'chat_model_needs_tools')
  assert.deepEqual(res.route.tools, ALL_TOOLS)
  assert.deepEqual(toolNames(factory.requests[1]), ALL_TOOLS)
  assert.deepEqual(tokens, ['먹였어요'])
})

test('NEED_TOOLS 표시는 대소문자·앞뒤 공백·마침표와 상관없이 알아보고, 화면에 흘리지 않음', async () => {
  for (const marker of ['need_tools', ' Need_Tools.', 'NEED_', 'NEED_TOOLS']) {
    const parts = marker === 'NEED_' ? ['NEED_', 'TOOLS'] : [marker]
    const stream = req => { for (const p of parts) req.onToken?.(p); return { content: parts.join(''), toolCalls: [], totalMs: 1 } }
    const factory = fakeClientFactory({ responses: { tiny: [stream], big: [{ content: '했어요' }] } })
    const service = make(factory)
    await service.init()
    const tokens = []
    const res = await service.chat('챙겨줘', { onToken: t => tokens.push(t) })
    assert.equal(res.route.fallback, 'chat_model_needs_tools', marker)
    assert.deepEqual(tokens, ['했어요'], marker)
  }
})

test('잡담 모델이 시간 초과·오류면 큰 모델(tool 전체)로 넘김', async () => {
  const hang = req => new Promise((_, reject) => req.signal.addEventListener('abort', () => reject(new Error('aborted'))))
  const factory = fakeClientFactory({ responses: { tiny: [hang], big: [{ content: '안녕하세요' }] } })
  const service = make(factory, { config: { ...config, routing: { ...config.routing, chatTimeoutMs: 20 } } })
  await service.init()
  const res = await service.chat('안녕')
  assert.equal(res.ok, true)
  assert.equal(res.model, 'big')
  assert.equal(res.route.fallback, 'chat_model_failed')
})

test('잡담 모델이 없으면 잡담도 큰 모델로 (tool 없이)', async () => {
  const factory = fakeClientFactory({ ping: { 'http://local/v1': false }, responses: { big: [{ content: '안녕하세요' }] } })
  const service = make(factory)
  await service.init()
  const res = await service.chat('안녕')
  assert.equal(res.model, 'big')
  assert.equal(res.route.kind, 'chat')
  assert.equal(res.route.fallback, 'no_chat_model')
  assert.deepEqual(toolNames(factory.requests[0]), [])
})

test('큰 모델 429 — 한 번 다시 시도해서 성공하면 retries=1', async () => {
  const factory = fakeClientFactory({ responses: { big: [new LlmError('too many', { status: 429 }), { content: '건강해요' }] } })
  const service = make(factory)
  await service.init()
  const res = await service.chat('상태')
  assert.equal(res.ok, true)
  assert.equal(res.retries, 1)
})

test('큰 모델 429가 두 번이면 rate_limited, 다른 오류는 error — 에이전트는 켜진 채', async () => {
  const limited = new LlmError('too many', { status: 429 })
  const factory = fakeClientFactory({ responses: { big: [limited, limited, new Error('boom')] } })
  const service = make(factory)
  await service.init()
  assert.equal((await service.chat('상태')).reason, 'rate_limited')
  assert.equal((await service.chat('상태')).reason, 'error')
  assert.equal(service.status().enabled, true)
})

test('큰 모델 연결이 끊기면 실패 결과와 함께 에이전트를 끔', async () => {
  const factory = fakeClientFactory({ responses: { big: [new LlmError('down', { code: 'unreachable' })] } })
  const service = make(factory)
  await service.init()
  assert.equal((await service.chat('상태')).reason, 'unreachable')
  assert.equal(service.status().enabled, false)
})

// ── 단계 상한·대화 기록 ─────────────────────────────────────────────────

test('tool 경로 단계 상한은 설정의 maxSteps', async () => {
  const call = { id: 'c', type: 'function', function: { name: 'get_pets', arguments: '{}' } }
  const factory = fakeClientFactory({ responses: { big: Array.from({ length: 5 }, () => ({ toolCalls: [call] })) } })
  const service = make(factory)
  await service.init()
  const res = await service.chat('상태 계속 봐')
  assert.equal(res.stoppedBy, 'max_steps')
  assert.equal(factory.requests.length, config.maxSteps)
})

test('대화 기록 — 다음 요청에 이전 질문·답을 넣고, 결과에 기록 크기', async () => {
  const factory = fakeClientFactory({ responses: { tiny: [{ content: '안녕하세요' }, { content: '천만에요' }] } })
  const service = make(factory)
  await service.init()
  await service.chat('안녕')
  const res = await service.chat('고마워')
  const msgs = factory.requests[1].messages
  assert.deepEqual(msgs.slice(1), [
    { role: 'user', content: '안녕' }, { role: 'assistant', content: '안녕하세요' },
    { role: 'user', content: '고마워' },
  ])
  assert.deepEqual(res.history, { turns: 1, summarized: 0 })
})

test('실패한 요청은 대화 기록에 남기지 않음', async () => {
  const factory = fakeClientFactory({ responses: { big: [new Error('boom'), { content: 'ok' }] } })
  const service = make(factory)
  await service.init()
  await service.chat('상태')
  const res = await service.chat('상태')
  assert.deepEqual(res.history, { turns: 0, summarized: 0 })
})

// ── 환산 비용·시간 ──────────────────────────────────────────────────────

test('환산 비용 — 실제로 답한 모델의 단가, 잡담 모델(로컬)은 0', async () => {
  const factory = fakeClientFactory({ responses: {
    big:  [{ content: 'a', usage: { promptTokens: 10, completionTokens: 4 } }],
    tiny: [{ content: 'b', usage: { promptTokens: 50, completionTokens: 5 } }],
  } })
  const service = make(factory)
  await service.init()
  assert.equal((await service.chat('상태')).costUsd, 0.000018)
  assert.equal((await service.chat('안녕')).costUsd, 0)
})

test('환산 비용 — 잡담 모델에서 큰 모델로 넘기면 큰 모델 단가', async () => {
  const factory = fakeClientFactory({ responses: { tiny: [{ content: 'NEED_TOOLS' }], big: [{ content: 'ok', usage: { promptTokens: 100, completionTokens: 0 } }] } })
  const service = make(factory)
  await service.init()
  assert.equal((await service.chat('챙겨줘')).costUsd, 0.0001)
})

test('totalMs — 요청을 받은 때부터 결과까지 (now 주입)', async () => {
  const times = [1000, 1450]
  const factory = fakeClientFactory({ responses: { big: [{ content: 'a' }] } })
  const service = make(factory, { now: () => times.shift() })
  await service.init()
  assert.equal((await service.chat('상태')).totalMs, 450)
})

// ── 비교 측정용 strategy ────────────────────────────────────────────────

test("strategy 'full' — 잡담도 큰 모델에 tool 6개 전부, 상태 전부(가방 포함)", async () => {
  const factory = fakeClientFactory({ responses: { big: [{ content: '안녕' }] } })
  const service = make(factory, { strategy: 'full' })
  await service.init()
  const res = await service.chat('안녕')
  assert.equal(res.model, 'big')
  assert.equal(res.route.kind, 'tools')
  assert.equal(res.route.reason, 'strategy_full')
  assert.deepEqual(toolNames(factory.requests[0]), ALL_TOOLS)
  assert.deepEqual(res.context.parts, ['pets', 'inventory'])
})

test("strategy 'routing' — 모델·tool은 라우팅대로, 상태는 전부", async () => {
  const factory = fakeClientFactory({ responses: { big: [{ content: 'a' }], tiny: [{ content: 'b' }] } })
  const service = make(factory, { strategy: 'routing' })
  await service.init()
  const tools = await service.chat('상태')
  assert.deepEqual(toolNames(factory.requests[0]), ['get_pets'])
  assert.deepEqual(tools.context.parts, ['pets', 'inventory'])
  const chat = await service.chat('안녕')
  assert.equal(chat.model, 'tiny')
  assert.deepEqual(chat.context.parts, ['pets', 'inventory'])
})

test('strategy 기본값은 라우팅 + 컨텍스트 선택', async () => {
  const factory = fakeClientFactory({ responses: { big: [{ content: 'a' }] } })
  const service = make(factory)
  await service.init()
  assert.deepEqual((await service.chat('상태')).context.parts, ['pets'])
})
