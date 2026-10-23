// 모델 라우팅 — 설정의 키워드 규칙으로 요청에 필요한 tool을 고르고 모델을 정한다.
// tool이 필요 없으면 잡담 모델(작은 모델), 필요하면 기본 모델(큰 모델)에 고른 tool만 넘긴다
import type { AgentConfig } from './config'

export interface RouteDecision {
  kind:      'chat' | 'tools'
  /** models의 이름 (small, large …) */
  modelName: string
  /** 넘길 tool — 기본 tool·의존 tool 포함, 설정 순서 */
  tools:     string[]
  /** 키워드로 직접 걸린 tool */
  matched:   string[]
  /** 로그용 판단 근거 */
  reason:    string
}

const squash = (text: string) => text.replace(/\s+/g, '').toLowerCase()

export function routeRequest(message: string, config: AgentConfig): RouteDecision {
  const { tools: rules, baseTools, chatModel } = config.routing
  const text = squash(message)

  const hits: string[] = []
  const matched = Object.entries(rules)
    .filter(([name, rule]) => {
      const keyword = rule.keywords.find(k => text.includes(squash(k)))
      if (keyword) hits.push(`${name}(${keyword})`)
      return Boolean(keyword)
    })
    .map(([name]) => name)

  if (matched.length === 0) {
    return { kind: 'chat', modelName: chatModel, tools: [], matched, reason: 'no_tool_keyword' }
  }

  const selected = new Set([...baseTools, ...matched])
  for (let added = true; added;) {
    added = false
    for (const name of [...selected]) {
      for (const dep of rules[name]?.requires ?? []) {
        if (!selected.has(dep)) { selected.add(dep); added = true }
      }
    }
  }

  return {
    kind:      'tools',
    modelName: config.defaultModel,
    tools:     Object.keys(rules).filter(name => selected.has(name)),
    matched,
    reason:    `keyword ${hits.join(', ')}`,
  }
}
