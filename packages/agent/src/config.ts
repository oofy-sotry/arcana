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

export interface AgentConfig {
  maxSteps:     number
  defaultModel: string
  providers:    Record<string, ProviderConfig>
  models:       Record<string, ModelConfig>
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
