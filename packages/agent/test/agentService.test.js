const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createAgentService, LlmError, MAX_MESSAGE_LENGTH } = require('../dist')

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
}

const game = {
  getPets: () => [{ id: 1, name: '불꽃이', level: 3, is_fainted: 0, conditions: { hunger: 20 } }],
  getInventory: () => [],
  useItem: () => ({ ok: true }),
  getZones: () => [],
  startAutoHunt: () => ({ battles: [], finalEnergy: 0 }),
  getParty: () => ({ members: [], synergy: null }),
}

// 응답을 차례로 돌려주는 가짜 클라이언트. 만들 때 받은 옵션과 요청은 기록된다
function fakeClientFactory({ ping = true, responses = [] } = {}) {
  const made = []
  const requests = []
  const createClient = opts => {
    made.push(opts)
    return {
      ping: async () => ping,
      chat: async req => {
        requests.push(req)
        const r = responses.shift()
        if (r instanceof Error) throw r
        return { content: r?.content ?? '', toolCalls: r?.toolCalls ?? [], usage: r?.usage, firstTokenMs: 5, totalMs: 9 }
      },
    }
  }
  return { createClient, made, requests }
}

const make = (overrides = {}, factory = fakeClientFactory()) =>
  createAgentService({ config, secrets: { remoteKey: 'k' }, env: {}, game, createClient: factory.createClient, ...overrides })

test('init — 키가 있고 ping 성공이면 기본 모델로 켜짐', async () => {
  const factory = fakeClientFactory()
  const status = await make({}, factory).init()
  assert.deepEqual(status, { enabled: true, model: 'big' })
  assert.deepEqual(factory.made[0], { baseURL: 'http://remote/v1', apiKey: 'k' })
})

test('init — 키가 필요한데 없으면 꺼짐(no_key), 공급자를 부르지 않음', async () => {
  const factory = fakeClientFactory()
  const status = await make({ secrets: {} }, factory).init()
  assert.equal(status.enabled, false)
  assert.equal(status.reason, 'no_key')
  assert.equal(factory.made.length, 0)
})

test('init — 공급자에 연결할 수 없으면 꺼짐(unreachable)', async () => {
  const status = await make({}, fakeClientFactory({ ping: false })).init()
  assert.deepEqual(status, { enabled: false, model: 'big', reason: 'unreachable' })
})

test('init — 설정이 잘못돼도 예외 대신 꺼짐(bad_config)', async () => {
  const status = await make({ config: { ...config, defaultModel: 'huge' } }).init()
  assert.equal(status.enabled, false)
  assert.equal(status.reason, 'bad_config')
})

test('status — init 전에는 꺼짐(not_ready)', () => {
  assert.deepEqual(make().status(), { enabled: false, reason: 'not_ready' })
})

test('chat — 꺼져 있으면 모델을 부르지 않고 실패 결과', async () => {
  const factory = fakeClientFactory({ ping: false })
  const service = make({}, factory)
  await service.init()
  const res = await service.chat('안녕')
  assert.equal(res.ok, false)
  assert.equal(factory.requests.length, 0)
})

test('chat — 빈 문자열·문자열 아님·너무 긴 입력은 실행 전에 거절', async () => {
  const factory = fakeClientFactory()
  const service = make({}, factory)
  await service.init()
  for (const bad of ['', '   ', 42, null, 'a'.repeat(MAX_MESSAGE_LENGTH + 1)]) {
    const res = await service.chat(bad)
    assert.equal(res.ok, false, String(bad).slice(0, 10))
  }
  assert.equal(factory.requests.length, 0)
})

test('chat — 시스템 프롬프트+사용자 메시지로 실행, 펫 tool 전달, 결과·사용량 반환', async () => {
  const factory = fakeClientFactory({ responses: [{ content: '배고파 보여요', usage: { promptTokens: 10, completionTokens: 4 } }] })
  const service = make({}, factory)
  await service.init()
  const res = await service.chat('  불꽃이 어때?  ')
  assert.equal(res.ok, true)
  assert.equal(res.reply, '배고파 보여요')
  assert.equal(res.model, 'big')
  assert.equal(res.steps, 1)
  assert.equal(res.toolCalls, 0)
  assert.equal(res.stoppedBy, 'answer')
  assert.deepEqual(res.usage, { promptTokens: 10, completionTokens: 4 })
  const req = factory.requests[0]
  assert.equal(req.model, 'big')
  assert.equal(req.messages[0].role, 'system')
  assert.deepEqual(req.messages[1], { role: 'user', content: '불꽃이 어때?' })
  assert.ok(req.tools.some(t => t.function.name === 'get_pets'))
})

test('chat — 시스템 프롬프트는 마크다운 없이 평문 답을 요구 (런처는 textContent로 표시)', async () => {
  const factory = fakeClientFactory({ responses: [{ content: 'ok' }] })
  const service = make({}, factory)
  await service.init()
  await service.chat('안녕')
  assert.match(factory.requests[0].messages[0].content, /마크다운/)
})

test('chat — 단계 상한은 설정의 maxSteps', async () => {
  const call = { id: 'c', type: 'function', function: { name: 'get_pets', arguments: '{}' } }
  const factory = fakeClientFactory({ responses: Array.from({ length: 5 }, () => ({ toolCalls: [call] })) })
  const service = make({}, factory)
  await service.init()
  const res = await service.chat('계속 봐')
  assert.equal(res.stoppedBy, 'max_steps')
  assert.equal(factory.requests.length, config.maxSteps)
})

test('chat — LLM 오류는 예외 대신 실패 결과, 429는 한도 초과로 구분', async () => {
  const factory = fakeClientFactory({ responses: [new LlmError('too many', { status: 429 }), new Error('boom')] })
  const service = make({}, factory)
  await service.init()
  const limited = await service.chat('안녕')
  assert.equal(limited.ok, false)
  assert.equal(limited.reason, 'rate_limited')
  const other = await service.chat('안녕')
  assert.equal(other.ok, false)
  assert.equal(other.reason, 'error')
  assert.equal(service.status().enabled, true)
})

test('chat — 실행 중 연결이 끊기면 실패 결과와 함께 에이전트를 끔', async () => {
  const factory = fakeClientFactory({ responses: [new LlmError('down', { code: 'unreachable' })] })
  const service = make({}, factory)
  await service.init()
  const res = await service.chat('안녕')
  assert.equal(res.reason, 'unreachable')
  assert.deepEqual(service.status(), { enabled: false, model: 'big', reason: 'unreachable' })
})
