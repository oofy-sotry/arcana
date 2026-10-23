// 에이전트 요청 기록 — @arcana/agent toRequestRecord가 만든 한 줄을 agent_requests에 저장하고, 런처 통계용으로 모은다
const COLUMNS = [
  'created_at', 'ok', 'fail_reason', 'route', 'model_name', 'model', 'tool_count', 'fallback', 'retries',
  'prompt_tokens', 'completion_tokens', 'first_token_ms', 'total_ms', 'cost_usd', 'tool_calls', 'steps',
  'stopped_by', 'context_chars', 'history_turns',
]

const roundUsd = n => Math.round((n || 0) * 1e9) / 1e9
const roundMs  = n => (n === null || n === undefined ? null : Math.round(n))

function createAgentRequestLog({ query, run, save }) {
  function record(row) {
    run(
      `INSERT INTO agent_requests (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`,
      COLUMNS.map(c => row[c] ?? null)
    )
    save()
  }

  function stats() {
    const [totals] = query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS failed,
              SUM(cost_usd) AS cost
         FROM agent_requests`
    )
    const byModel = query(
      `SELECT model, COUNT(*) AS count, AVG(total_ms) AS avg_total, AVG(first_token_ms) AS avg_first,
              SUM(prompt_tokens) AS prompt, SUM(completion_tokens) AS completion, SUM(cost_usd) AS cost
         FROM agent_requests WHERE ok = 1
        GROUP BY model ORDER BY count DESC, model`
    )
    return {
      total:        totals.total,
      failed:       totals.failed || 0,
      totalCostUsd: roundUsd(totals.cost),
      byModel: byModel.map(r => ({
        model:            r.model,
        count:            r.count,
        avgTotalMs:       roundMs(r.avg_total),
        avgFirstTokenMs:  roundMs(r.avg_first),
        promptTokens:     r.prompt || 0,
        completionTokens: r.completion || 0,
        costUsd:          roundUsd(r.cost),
      })),
    }
  }

  return { record, stats }
}

module.exports = { createAgentRequestLog, COLUMNS }
