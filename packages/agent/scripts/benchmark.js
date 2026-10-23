// 3조건 비교 측정 — 고정 요청 세트를 실제 모델로 ① 큰 모델 + 상태 전부 ② 라우팅만 ③ 라우팅 + 컨텍스트 선택으로 돌려
// 토큰·지연·환산 비용·tool 호출·기대 행동 실행 여부를 비교한다. 요청마다 게임 상태를 새로 만들고 대화 기록 없이 실행.
// 실행: pnpm --filter @arcana/agent benchmark [-- --out 결과.json]   (빌드 후, 키는 GEMINI_API_KEY 또는 agent-secrets.json)
// 무료 한도 때문에 모델 호출 사이에 간격을 두고, 그 대기 시간은 지연에서 뺀다
const fs   = require('fs')
const os   = require('os')
const path = require('path')
const { loadAgentConfig, loadSecrets, createAgentService, createChatClient } = require('../dist')
const requests = require('../test/fixtures/requests.json')

const USER_DIR    = path.join(os.homedir(), '.config', 'arcana')
const INTERVAL_MS = Number(process.env.BENCH_INTERVAL_MS ?? 4500)
const STRATEGIES  = [
  { id: 'full',            label: '① 큰 모델 + 상태 전부' },
  { id: 'routing',         label: '② 라우팅만' },
  { id: 'routing+context', label: '③ 라우팅 + 컨텍스트 선택' },
]
const outArg  = process.argv.indexOf('--out')
const outPath = outArg > 0 ? process.argv[outArg + 1] : null

// 요청마다 새로 만드는 게임 상태 — 펫 1마리(배고프고 조금 더러움), 가방에 먹이·비누·에너지 물약, 사냥터 3곳
function makeGame() {
  const actions = []
  const pet = { id: 1, name: '불꽃이', attribute: 'fire', level: 5, evolution_stage: 1, is_fainted: 0,
    conditions: { hunger: 15, happiness: 70, cleanliness: 30, energy: 60 } }
  const bag = {
    pet_food:      { name: '펫 사료',     effect: 'hunger_restore', stat: 'hunger',      quantity: 3 },
    pet_soap:      { name: '펫 비누',     effect: 'clean_restore',  stat: 'cleanliness', quantity: 2 },
    energy_potion: { name: '에너지 물약', effect: 'energy_restore', stat: 'energy',      quantity: 1 },
  }
  const zones = [
    { id: 'wind_plains',   name: '바람의 평원', attribute: 'wind',  minLevel: 1,  maxLevel: 8,  accessible: true,  recommended: true,  edge: 1.6 },
    { id: 'water_shore',   name: '물가 해안',   attribute: 'water', minLevel: 3,  maxLevel: 10, accessible: true,  recommended: false, edge: 0.7 },
    { id: 'thunder_field', name: '번개 초원',   attribute: 'thunder', minLevel: 15, maxLevel: 25, accessible: false, recommended: false, edge: 0.4 },
  ]
  return {
    actions,
    getPets: () => [pet],
    getInventory: () => Object.entries(bag).filter(([, i]) => i.quantity > 0)
      .map(([id, i]) => ({ item_id: id, quantity: i.quantity, data: { name: i.name, type: 'consumable', effect: i.effect } })),
    useItem: (_petId, itemId) => {
      const item = bag[itemId]
      if (!item || item.quantity < 1) return { ok: false, reason: 'no_item' }
      item.quantity--
      pet.conditions[item.stat] = Math.min(100, pet.conditions[item.stat] + 40)
      actions.push('use_item')
      return { ok: true, effect: item.effect, [item.stat]: pet.conditions[item.stat] }
    },
    getZones: () => zones,
    startAutoHunt: (_petId, zoneId) => {
      if (!zones.find(z => z.id === zoneId && z.accessible)) return { error: '접근 불가 구역입니다' }
      if (pet.conditions.energy < 30) return { error: '에너지 부족' }
      const fights = Math.floor(pet.conditions.energy / 30)
      pet.conditions.energy -= fights * 30
      actions.push('start_auto_hunt')
      return { battles: Array.from({ length: fights }, () => ({ result: 'won' })), finalEnergy: pet.conditions.energy }
    },
    getParty: () => ({ members: [{ ...pet, slot: 0 }], synergy: { bonus: 0 } }),
  }
}

// 모델 호출 사이 간격 — 기다린 시간은 waited에 쌓아 지연 계산에서 뺀다
let lastCall = 0
function throttledClientFactory(waited) {
  return opts => {
    const inner = createChatClient(opts)
    return {
      ping: inner.ping,
      chat: async req => {
        const wait = Math.max(0, lastCall + INTERVAL_MS - Date.now())
        if (wait) { waited.ms += wait; await new Promise(r => setTimeout(r, wait)) }
        lastCall = Date.now()
        return inner.chat(req)
      },
    }
  }
}

async function runOne(strategy, request, config, secrets) {
  const game   = makeGame()
  const waited = { ms: 0 }
  const service = createAgentService({ config, secrets, env: process.env, game, strategy, createClient: throttledClientFactory(waited) })
  const status = await service.init()
  if (!status.enabled) throw new Error(`에이전트가 꺼져 있음: ${status.reason}`)
  const res = await service.chat(request.message)
  const expected = request.actions ?? []
  return {
    strategy, message: request.message, expect: request.expect, ok: res.ok,
    ...(res.ok ? {
      model: res.model, route: res.route.kind, tools: res.route.tools.length, fallback: res.route.fallback ?? null,
      promptTokens: res.usage.promptTokens, completionTokens: res.usage.completionTokens,
      firstTokenMs: res.firstTokenMs ?? null, totalMs: res.totalMs - waited.ms, costUsd: res.costUsd,
      toolCalls: res.toolCalls, steps: res.steps, stoppedBy: res.stoppedBy, contextChars: res.context.chars, retries: res.retries,
      reply: res.reply,
    } : { reason: res.reason, error: res.error }),
    expectedActions: expected,
    actionsDone: expected.length ? expected.every(a => game.actions.includes(a)) : null,
  }
}

const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function summarize(rows) {
  return STRATEGIES.map(({ id, label }) => {
    const all = rows.filter(r => r.strategy === id)
    const ok  = all.filter(r => r.ok)
    const act = all.filter(r => r.actionsDone !== null)
    return {
      label,
      ok: `${ok.length}/${all.length}`,
      promptTokens: Math.round(avg(ok.map(r => r.promptTokens))),
      completionTokens: Math.round(avg(ok.map(r => r.completionTokens))),
      firstTokenMs: Math.round(avg(ok.filter(r => r.firstTokenMs !== null).map(r => r.firstTokenMs))),
      totalMs: Math.round(avg(ok.map(r => r.totalMs))),
      costUsd: ok.reduce((s, r) => s + (r.costUsd ?? 0), 0),
      toolCalls: avg(ok.map(r => r.toolCalls)),
      steps: avg(ok.map(r => r.steps)),
      maxSteps: ok.filter(r => r.stoppedBy === 'max_steps').length,
      actions: `${act.filter(r => r.actionsDone).length}/${act.length}`,
    }
  })
}

function printTable(summary) {
  const base = summary[0]
  const pct = (v, b) => (b ? `${v <= b ? '-' : '+'}${Math.abs(Math.round((1 - v / b) * 100))}%` : '-')
  console.log('| 조건 | 성공 | 평균 입력 토큰 | 평균 출력 토큰 | 평균 첫 토큰 | 평균 전체 시간 | 환산 비용 합(20건) | 평균 tool 호출 | 평균 단계 | 단계 상한 | 기대 행동 실행 |')
  console.log('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const s of summary) {
    const vs = s === base ? '' : ` (${pct(s.promptTokens, base.promptTokens)})`
    console.log(`| ${s.label} | ${s.ok} | ${s.promptTokens}${vs} | ${s.completionTokens} | ${(s.firstTokenMs / 1000).toFixed(2)}초 | ${(s.totalMs / 1000).toFixed(2)}초${s === base ? '' : ` (${pct(s.totalMs, base.totalMs)})`} | $${s.costUsd.toFixed(5)}${s === base ? '' : ` (${pct(s.costUsd, base.costUsd)})`} | ${s.toolCalls.toFixed(2)} | ${s.steps.toFixed(2)} | ${s.maxSteps} | ${s.actions} |`)
  }
}

;(async () => {
  const config  = loadAgentConfig({ overridePath: path.join(USER_DIR, 'agent.json') })
  const secrets = loadSecrets(path.join(USER_DIR, 'agent-secrets.json'))
  console.log(`모델: 큰=${config.models[config.defaultModel].model}, 잡담=${config.models[config.routing.chatModel].model} · 요청 ${requests.length}개 × 조건 ${STRATEGIES.length}개 · 호출 간격 ${INTERVAL_MS}ms`)
  const rows = []
  // 시간대에 따른 공급자 지연 차이가 한 조건에 몰리지 않게 요청마다 세 조건을 번갈아 돈다
  for (const [i, request] of requests.entries()) {
    for (const { id } of STRATEGIES) {
      const row = await runOne(id, request, config, secrets)
      rows.push(row)
      console.log(`[${i + 1}/${requests.length}] ${id.padEnd(15)} ${row.ok ? `ok ${row.promptTokens}/${row.completionTokens}토큰 ${row.totalMs}ms tool ${row.toolCalls}` : `실패 ${row.reason}`}${row.actionsDone === false ? ' 행동 미실행' : ''} — ${request.message}`)
    }
  }
  const summary = summarize(rows)
  console.log('')
  printTable(summary)
  if (outPath) fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), intervalMs: INTERVAL_MS, config: { large: config.models[config.defaultModel].model, chat: config.models[config.routing.chatModel].model, pricing: config.pricing }, summary, rows }, null, 2))
})().catch(err => { console.error(err); process.exit(1) })
