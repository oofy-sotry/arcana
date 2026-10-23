// 에이전트 설정 — 공급자 주소·모델 이름·단계 상한은 코드가 아니라 JSON 설정에서 읽는다.
// 기본값은 config/agent.default.json, 사용자 덮어쓰기는 userData/agent.json,
// API 키는 환경변수 또는 userData/agent-secrets.json (main 프로세스만 읽음)
import * as fs from 'node:fs'
import * as path from 'node:path'

export const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'agent.default.json')

export interface ProviderConfig {
  baseURL:       string
  /** 키를 읽을 환경변수 이름 — 비밀 파일보다 우선 */
  apiKeyEnv?:    string
  /** agent-secrets.json에서 키를 읽을 항목 이름 */
  apiKeySecret?: string
}

export interface ModelConfig {
  provider: string
  model:    string
}

/** 키워드가 들어 있으면 이 tool이 필요하다고 본다. requires는 함께 넣을 tool */
export interface ToolRouteRule {
  keywords:  string[]
  requires?: string[]
}

export interface RoutingConfig {
  /** tool이 필요 없는 짧은 대화에 쓸 모델 (models의 이름) — tool이 필요하면 defaultModel */
  chatModel:     string
  /** tool 경로면 항상 넣는 tool */
  baseTools:     string[]
  tools:         Record<string, ToolRouteRule>
  /** 잡담 모델이 이 시간 안에 못 끝내면 큰 모델로 넘긴다 */
  chatTimeoutMs: number
  /** 무료 한도 초과(429) 뒤 한 번 다시 시도하기 전 대기 */
  retryDelayMs:  number
  /** 원문으로 남길 최근 대화 턴 수 — 더 오래된 턴은 요약 한 줄로 */
  historyTurns:  number
  /** 프롬프트에 넣을 펫 수 상한 */
  contextMaxPets: number
}

/** 참고 단가 — USD / 100만 토큰. 무료 공급자라 실제 과금은 없고 환산 비용 계산에만 쓴다 */
export interface ModelPrice {
  inputPer1M:  number
  outputPer1M: number
}

export interface PricingConfig {
  /** 단가 출처·확인 날짜 */
  note:   string
  models: Record<string, ModelPrice>
}

export interface AgentConfig {
  maxSteps:     number
  defaultModel: string
  providers:    Record<string, ProviderConfig>
  models:       Record<string, ModelConfig>
  routing:      RoutingConfig
  pricing:      PricingConfig
}

export interface ResolvedModel {
  /** 설정 안의 이름 (small, large …) */
  name:      string
  provider:  string
  baseURL:   string
  model:     string
  apiKey?:   string
  /** 키가 필요한 공급자인데 키가 없으면 false */
  available: boolean
}

function readJson(filePath: string): unknown {
  const text = fs.readFileSync(filePath, 'utf8')
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`설정 파일을 읽을 수 없습니다: ${filePath} (${(err as Error).message})`)
  }
}

function readJsonIfExists(filePath: string | undefined): Record<string, unknown> {
  if (!filePath || !fs.existsSync(filePath)) return {}
  return readJson(filePath) as Record<string, unknown>
}

export function loadAgentConfig({ defaultsPath = DEFAULT_CONFIG_PATH, overridePath }: { defaultsPath?: string; overridePath?: string } = {}): AgentConfig {
  const base     = readJson(defaultsPath) as AgentConfig
  const override = readJsonIfExists(overridePath) as Partial<AgentConfig>
  return {
    maxSteps:     override.maxSteps     ?? base.maxSteps,
    defaultModel: override.defaultModel ?? base.defaultModel,
    providers:    { ...base.providers, ...override.providers },
    models:       { ...base.models, ...override.models },
    routing:      {
      ...base.routing,
      ...override.routing,
      tools: { ...base.routing?.tools, ...override.routing?.tools },
    },
    pricing:      {
      note:   override.pricing?.note ?? base.pricing?.note,
      models: { ...base.pricing?.models, ...override.pricing?.models },
    },
  }
}

export function loadSecrets(secretsPath: string): Record<string, string> {
  return readJsonIfExists(secretsPath) as Record<string, string>
}

export function resolveModel(
  config: AgentConfig,
  name: string,
  { env, secrets }: { env: Record<string, string | undefined>; secrets: Record<string, string> },
): ResolvedModel {
  const modelConfig = config.models[name]
  if (!modelConfig) throw new Error(`설정에 없는 모델입니다: ${name}`)
  const provider = config.providers[modelConfig.provider]
  if (!provider) throw new Error(`설정에 없는 공급자입니다: ${modelConfig.provider}`)

  const needsKey = Boolean(provider.apiKeyEnv || provider.apiKeySecret)
  const apiKey   = (provider.apiKeyEnv && env[provider.apiKeyEnv])
    || (provider.apiKeySecret && secrets[provider.apiKeySecret])
    || undefined

  return {
    name,
    provider:  modelConfig.provider,
    baseURL:   provider.baseURL,
    model:     modelConfig.model,
    apiKey,
    available: !needsKey || Boolean(apiKey),
  }
}
