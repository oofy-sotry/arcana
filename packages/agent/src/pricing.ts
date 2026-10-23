// 환산 비용 — 무료 공급자라 실제 과금은 없고, 설정의 참고 단가표로 요청 비용을 계산해 비교에 쓴다
import type { AgentConfig } from './config'
import type { ChatUsage } from './llmClient'

/** USD. 단가표에 없는 모델은 null (0으로 기록하면 비교가 틀어진다) */
export function estimateCostUsd(config: Pick<AgentConfig, 'pricing'>, modelName: string, usage: ChatUsage): number | null {
  const price = config.pricing.models[modelName]
  if (!price) return null
  const cost = (usage.promptTokens * price.inputPer1M + usage.completionTokens * price.outputPer1M) / 1_000_000
  return Math.round(cost * 1e9) / 1e9
}
