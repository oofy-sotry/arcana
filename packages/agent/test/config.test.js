const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs   = require('node:fs')
const os   = require('node:os')
const path = require('node:path')
const { loadAgentConfig, loadSecrets, resolveModel, DEFAULT_CONFIG_PATH } = require('../dist')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'arcana-agent-'))

test('기본 설정 — 공급자 2개(ollama·gemini)와 small·large 모델', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  assert.ok(config.providers.ollama.baseURL)
  assert.ok(config.providers.gemini.baseURL)
  assert.equal(config.models[config.defaultModel].provider, 'gemini') // tool을 쓰는 대화는 큰 모델 (작은 모델은 D4 라우팅에서 잡담용)
  assert.ok(config.maxSteps > 0)
})

test('사용자 설정 파일이 없으면 기본값 그대로', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath: path.join(tmp(), 'none.json') })
  assert.deepEqual(config, loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH }))
})

test('사용자 설정 — 바꾼 모델만 덮어쓰고 나머지는 기본값 유지', () => {
  const dir = tmp()
  const overridePath = path.join(dir, 'agent.json')
  fs.writeFileSync(overridePath, JSON.stringify({ maxSteps: 3, models: { small: { provider: 'ollama', model: 'llama3.2:3b' } } }))
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath })
  assert.equal(config.maxSteps, 3)
  assert.equal(config.models.small.model, 'llama3.2:3b')
  assert.ok(config.models.large)
  assert.ok(config.providers.gemini)
})

test('사용자 설정이 깨진 JSON이면 오류에 파일 경로 포함', () => {
  const overridePath = path.join(tmp(), 'agent.json')
  fs.writeFileSync(overridePath, '{ broken')
  assert.throws(() => loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath }), /agent\.json/)
})

test('비밀 파일 — 없으면 빈 객체', () => {
  assert.deepEqual(loadSecrets(path.join(tmp(), 'none.json')), {})
})

test('resolveModel — 키가 필요 없는 공급자(ollama)', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const m = resolveModel(config, 'small', { env: {}, secrets: {} })
  assert.equal(m.name, 'small')
  assert.equal(m.provider, 'ollama')
  assert.equal(m.baseURL, config.providers.ollama.baseURL)
  assert.equal(m.model, config.models.small.model)
  assert.equal(m.apiKey, undefined)
  assert.equal(m.available, true)
})

test('resolveModel — 환경변수 키가 비밀 파일보다 우선', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const m = resolveModel(config, 'large', { env: { GEMINI_API_KEY: 'from-env' }, secrets: { geminiKey: 'from-file' } })
  assert.equal(m.apiKey, 'from-env')
  assert.equal(m.available, true)
})

test('resolveModel — 환경변수가 없으면 비밀 파일 키 사용', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const m = resolveModel(config, 'large', { env: {}, secrets: { geminiKey: 'from-file' } })
  assert.equal(m.apiKey, 'from-file')
})

test('resolveModel — 키가 필요한데 없으면 available=false', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const m = resolveModel(config, 'large', { env: {}, secrets: {} })
  assert.equal(m.available, false)
  assert.equal(m.apiKey, undefined)
})

test('resolveModel — 없는 모델·공급자 이름은 오류', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  assert.throws(() => resolveModel(config, 'huge', { env: {}, secrets: {} }), /huge/)
  const broken = { ...config, models: { x: { provider: 'nowhere', model: 'm' } } }
  assert.throws(() => resolveModel(broken, 'x', { env: {}, secrets: {} }), /nowhere/)
})

test('기본 라우팅 설정 — 잡담 모델은 models에 있고, tool 규칙은 펫 tool 6개와 정확히 일치', () => {
  const { createPetTools } = require('../dist')
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const r = config.routing
  assert.ok(config.models[r.chatModel])
  const toolNames = createPetTools({}).map(t => t.name).sort()
  assert.deepEqual(Object.keys(r.tools).sort(), toolNames)
  for (const [name, rule] of Object.entries(r.tools)) {
    assert.ok(rule.keywords.length > 0, name)
    for (const dep of rule.requires ?? []) assert.ok(toolNames.includes(dep), `${name} → ${dep}`)
  }
  for (const t of r.baseTools) assert.ok(toolNames.includes(t), t)
  assert.ok(r.chatTimeoutMs > 0 && r.retryDelayMs >= 0 && r.historyTurns > 0 && r.contextMaxPets > 0)
})

test('사용자 설정 — routing은 바꾼 값만 덮어쓰고, tools는 tool별로 병합', () => {
  const overridePath = path.join(tmp(), 'agent.json')
  fs.writeFileSync(overridePath, JSON.stringify({ routing: { historyTurns: 2, tools: { get_party: { keywords: ['팀원'] } } } }))
  const base   = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath })
  assert.equal(config.routing.historyTurns, 2)
  assert.equal(config.routing.chatModel, base.routing.chatModel)
  assert.deepEqual(config.routing.tools.get_party, { keywords: ['팀원'] })
  assert.deepEqual(config.routing.tools.use_item, base.routing.tools.use_item)
})

test('기본 참고 단가표 — 모든 모델에 입력·출력 단가(0 이상), 출처 메모', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  assert.ok(config.pricing.note.length > 0)
  for (const name of Object.keys(config.models)) {
    const p = config.pricing.models[name]
    assert.ok(p, name)
    assert.ok(p.inputPer1M >= 0 && p.outputPer1M >= 0, name)
  }
})

test('사용자 설정 — 단가는 모델별로 덮어씀', () => {
  const overridePath = path.join(tmp(), 'agent.json')
  fs.writeFileSync(overridePath, JSON.stringify({ pricing: { models: { large: { inputPer1M: 1, outputPer1M: 2 } } } }))
  const base   = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath })
  assert.deepEqual(config.pricing.models.large, { inputPer1M: 1, outputPer1M: 2 })
  assert.deepEqual(config.pricing.models.small, base.pricing.models.small)
  assert.equal(config.pricing.note, base.pricing.note)
})

test('기본 설정 — 게이트웨이 공급자는 있지만 요약 job은 꺼짐 (켜면 게이트웨이를 띄워야 함)', () => {
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  assert.ok(config.providers.gateway.baseURL)
  assert.equal(config.summary.enabled, false)
  assert.equal(config.summary.provider, 'gateway')
  assert.ok(config.summary.pollMs > 0)
  assert.ok(config.summary.timeoutMs > config.summary.pollMs)
})

test('resolveModel — 게이트웨이를 큰 모델 공급자로 바꾸면 게이트웨이 토큰을 키로 씀', () => {
  const dir = tmp()
  const overridePath = path.join(dir, 'agent.json')
  fs.writeFileSync(overridePath, JSON.stringify({ models: { large: { provider: 'gateway', model: 'gemini-flash-lite-latest' } } }))
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath })
  const m = resolveModel(config, 'large', { env: {}, secrets: { gatewayToken: 'gw', geminiKey: 'gem' } })
  assert.equal(m.baseURL, config.providers.gateway.baseURL)
  assert.equal(m.apiKey, 'gw')
})

test('사용자 설정 — summary는 바꾼 항목만 덮어씀', () => {
  const dir = tmp()
  const overridePath = path.join(dir, 'agent.json')
  fs.writeFileSync(overridePath, JSON.stringify({ summary: { enabled: true } }))
  const base   = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH })
  const config = loadAgentConfig({ defaultsPath: DEFAULT_CONFIG_PATH, overridePath })
  assert.deepEqual(config.summary, { ...base.summary, enabled: true })
})
