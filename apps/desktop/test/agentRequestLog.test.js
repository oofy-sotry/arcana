const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const initSqlJs = require('sql.js')
const { toRequestRecord } = require('@arcana/agent')
const migration = require('../src/db/migrations/018_agent_requests')
const { createAgentRequestLog, COLUMNS } = require('../src/main/agentRequestLog')

// 실제 sql.js 메모리 DB에 마이그레이션을 적용하고 database.js와 같은 query/run 모양으로 감싼다
async function memoryDb() {
  const SQL = await initSqlJs({ locateFile: () => path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm') })
  const db = new SQL.Database()
  migration.forEach(sql => db.run(sql))
  return {
    run:   (sql, params = []) => db.run(sql, params),
    query: (sql, params = []) => {
      const stmt = db.prepare(sql)
      stmt.bind(params)
      const rows = []
      while (stmt.step()) rows.push(stmt.getAsObject())
      stmt.free()
      return rows
    },
    save: () => {},
  }
}

const okResult = (model, modelName, { prompt = 100, completion = 10, first = 500, cost = 0.001 } = {}) => ({
  ok: true, reply: 'x', model, steps: 2, toolCalls: 1, stoppedBy: 'answer',
  usage: { promptTokens: prompt, completionTokens: completion }, firstTokenMs: first,
  route: { kind: modelName === 'small' ? 'chat' : 'tools', modelName, tools: [], reason: 'r' },
  context: { chars: 50, parts: ['pets'] }, history: { turns: 0, summarized: 0 }, retries: 0, costUsd: cost, totalMs: 1,
})

test('COLUMNS — @arcana/agent toRequestRecord의 항목과 정확히 일치', () => {
  const keys = Object.keys(toRequestRecord(okResult('m', 'large'), { createdAt: 1, totalMs: 1 })).sort()
  assert.deepEqual([...COLUMNS].sort(), keys)
})

test('record — 한 줄 저장 후 save 호출, 값 그대로 읽힘', async () => {
  const db = await memoryDb()
  let saved = 0
  const log = createAgentRequestLog({ ...db, save: () => saved++ })
  const row = toRequestRecord(okResult('gemini-x', 'large'), { createdAt: 1700000000000, totalMs: 1234 })
  log.record(row)
  assert.equal(saved, 1)
  const [got] = db.query('SELECT * FROM agent_requests')
  for (const c of COLUMNS) assert.equal(got[c], row[c], c)
})

test('stats — 모델별 호출 수·성공 수·평균 전체/첫 토큰 시간·토큰 합·환산 비용 합, 실패는 따로', async () => {
  const db = await memoryDb()
  const log = createAgentRequestLog(db)
  log.record(toRequestRecord(okResult('gemini-x', 'large', { first: 400, cost: 0.002 }), { createdAt: 1, totalMs: 1000 }))
  log.record(toRequestRecord(okResult('gemini-x', 'large', { first: 600, cost: 0.004 }), { createdAt: 2, totalMs: 3000 }))
  log.record(toRequestRecord(okResult('qwen', 'small', { first: 900, cost: 0 }), { createdAt: 3, totalMs: 5000 }))
  log.record(toRequestRecord({ ok: false, reason: 'rate_limited', error: 'x' }, { createdAt: 4, totalMs: 50 }))

  const s = log.stats()
  assert.equal(s.total, 4)
  assert.equal(s.failed, 1)
  assert.equal(s.totalCostUsd, 0.006)
  assert.deepEqual(s.byModel, [
    { model: 'gemini-x', count: 2, avgTotalMs: 2000, avgFirstTokenMs: 500, promptTokens: 200, completionTokens: 20, costUsd: 0.006 },
    { model: 'qwen',     count: 1, avgTotalMs: 5000, avgFirstTokenMs: 900, promptTokens: 100, completionTokens: 10, costUsd: 0 },
  ])
})

test('stats — 기록이 없으면 0', async () => {
  assert.deepEqual(createAgentRequestLog(await memoryDb()).stats(), { total: 0, failed: 0, totalCostUsd: 0, byModel: [] })
})
