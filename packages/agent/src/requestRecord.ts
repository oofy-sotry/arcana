// 요청 기록 한 줄 — desktop이 DB(agent_requests)에 그대로 넣는다. 메시지·답 원문과 오류 문장은 넣지 않는다
import type { AgentChatResult } from './agentService'

export interface AgentRequestRecord {
  created_at:        number
  ok:                0 | 1
  fail_reason:       string | null
  route:             string | null
  model_name:        string | null
  model:             string | null
  tool_count:        number | null
  fallback:          string | null
  retries:           number | null
  prompt_tokens:     number | null
  completion_tokens: number | null
  first_token_ms:    number | null
  total_ms:          number
  cost_usd:          number | null
  tool_calls:        number | null
  steps:             number | null
  stopped_by:        string | null
  context_chars:     number | null
  history_turns:     number | null
}

export function toRequestRecord(res: AgentChatResult, { createdAt, totalMs }: { createdAt: number; totalMs: number }): AgentRequestRecord {
  if (!res.ok) {
    return {
      created_at: createdAt, ok: 0, fail_reason: res.reason,
      route: null, model_name: null, model: null, tool_count: null, fallback: null, retries: null,
      prompt_tokens: null, completion_tokens: null, first_token_ms: null, total_ms: totalMs,
      cost_usd: null, tool_calls: null, steps: null, stopped_by: null, context_chars: null, history_turns: null,
    }
  }
  return {
    created_at:        createdAt,
    ok:                1,
    fail_reason:       null,
    route:             res.route.kind,
    model_name:        res.route.modelName,
    model:             res.model,
    tool_count:        res.route.tools.length,
    fallback:          res.route.fallback ?? null,
    retries:           res.retries,
    prompt_tokens:     res.usage.promptTokens,
    completion_tokens: res.usage.completionTokens,
    first_token_ms:    res.firstTokenMs ?? null,
    total_ms:          totalMs,
    cost_usd:          res.costUsd,
    tool_calls:        res.toolCalls,
    steps:             res.steps,
    stopped_by:        res.stoppedBy,
    context_chars:     res.context.chars,
    history_turns:     res.history.turns,
  }
}
