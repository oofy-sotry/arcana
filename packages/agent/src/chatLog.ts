// 요청 한 건을 로그 한 줄로 — 어떤 모델로 갔는지, 넣은 컨텍스트가 얼마인지 로그로 확인하기 위함 (D5에서 DB 기록으로 확장)
import type { AgentChatResult } from './agentService'

export function formatChatLog(res: AgentChatResult, totalMs: number): string {
  if (!res.ok) return `fail reason=${res.reason} total=${totalMs}ms error=${JSON.stringify(res.error)}`
  const fields = [
    'ok',
    `route=${res.route.kind}`,
    `model=${res.model}`,
    `tools=${res.route.tools.join(',') || '-'}`,
    `context=${res.context.chars}자(${res.context.parts.join('+')})`,
    `history=${res.history.turns}턴(요약${res.history.summarized}${res.history.llmSummary ? '+LLM' : ''})`,
    `tokens=${res.usage.promptTokens}/${res.usage.completionTokens}`,
    `steps=${res.steps}`,
    `toolCalls=${res.toolCalls}`,
    `first=${res.firstTokenMs === undefined ? '-' : `${res.firstTokenMs}ms`}`,
    `total=${totalMs}ms`,
  ]
  if (res.route.fallback) fields.push(`fallback=${res.route.fallback}`)
  if (res.retries) fields.push(`retries=${res.retries}`)
  fields.push(`reason=${JSON.stringify(res.route.reason)}`)
  return fields.join(' ')
}
