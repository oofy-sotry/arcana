// 에이전트 서비스 — desktop main이 쓰는 진입점. 설정·키로 기본 모델을 고르고 연결을 확인한 뒤,
// 사용자 메시지를 검증해 에이전트 루프를 돌린다. 공급자 문제는 예외 대신 꺼짐 상태나 실패 결과로 돌려줘
// 게임 쪽은 에이전트가 없어도 그대로 동작한다
import { resolveModel, type AgentConfig } from './config'
import { createChatClient, LlmError, type ChatClient, type ChatUsage } from './llmClient'
import { runAgent, type ToolCallEvent } from './agentLoop'
import { createPetTools, type GameApi } from './petTools'

export const MAX_MESSAGE_LENGTH = 500

const SYSTEM_PROMPT = [
  '너는 데스크톱 펫 RPG "아르카나"에서 플레이어를 돕는 도우미다.',
  '펫 상태·가방·사냥터·파티는 반드시 tool로 확인하고, 추측해서 말하지 않는다.',
  '플레이어가 부탁한 행동만 tool로 실행하고, 한국어로 짧게 답한다.',
].join('\n')

const MAX_STEPS_REPLY = '여러 단계를 거쳐도 끝내지 못했어요. 조금 더 구체적으로 부탁해 주세요.'

export type DisabledReason = 'not_ready' | 'no_key' | 'unreachable' | 'bad_config'

export interface AgentStatus {
  enabled: boolean
  model?:  string
  reason?: DisabledReason
}

export type AgentChatResult =
  | {
      ok:            true
      reply:         string
      model:         string
      steps:         number
      toolCalls:     number
      stoppedBy:     'answer' | 'max_steps'
      usage:         ChatUsage
      firstTokenMs?: number
    }
  | { ok: false; reason: 'disabled' | 'invalid_input' | 'rate_limited' | 'unreachable' | 'error'; error: string }

export interface AgentServiceOptions {
  config:        AgentConfig
  secrets:       Record<string, string>
  env:           Record<string, string | undefined>
  game:          GameApi
  createClient?: (opts: { baseURL: string; apiKey?: string }) => ChatClient
}

export interface ChatOptions {
  onToken?:    (token: string) => void
  onToolCall?: (event: ToolCallEvent) => void
  signal?:     AbortSignal
}

export function createAgentService({ config, secrets, env, game, createClient = createChatClient }: AgentServiceOptions) {
  let status: AgentStatus = { enabled: false, reason: 'not_ready' }
  let client: ChatClient | undefined
  const tools = createPetTools(game)

  async function init(): Promise<AgentStatus> {
    let resolved
    try {
      resolved = resolveModel(config, config.defaultModel, { env, secrets })
    } catch {
      return (status = { enabled: false, reason: 'bad_config' })
    }
    if (!resolved.available) return (status = { enabled: false, model: resolved.model, reason: 'no_key' })

    client = createClient({ baseURL: resolved.baseURL, apiKey: resolved.apiKey })
    const reachable = await client.ping()
    status = reachable
      ? { enabled: true, model: resolved.model }
      : { enabled: false, model: resolved.model, reason: 'unreachable' }
    return status
  }

  async function chat(message: unknown, { onToken, onToolCall, signal }: ChatOptions = {}): Promise<AgentChatResult> {
    if (!status.enabled || !client || !status.model) {
      return { ok: false, reason: 'disabled', error: '에이전트가 꺼져 있습니다' }
    }
    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) return { ok: false, reason: 'invalid_input', error: '메시지가 비어 있습니다' }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, reason: 'invalid_input', error: `메시지는 ${MAX_MESSAGE_LENGTH}자까지 보낼 수 있습니다` }
    }

    const model = status.model
    try {
      const res = await runAgent({
        client,
        model,
        tools,
        maxSteps:      config.maxSteps,
        maxStepsReply: MAX_STEPS_REPLY,
        messages:      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }],
        onToken,
        onToolCall,
        signal,
      })
      return {
        ok:           true,
        reply:        res.reply,
        model,
        steps:        res.steps,
        toolCalls:    res.toolCalls,
        stoppedBy:    res.stoppedBy,
        usage:        res.usage,
        firstTokenMs: res.firstTokenMs,
      }
    } catch (err) {
      const error = (err as Error).message
      if (err instanceof LlmError && err.status === 429) return { ok: false, reason: 'rate_limited', error }
      if (err instanceof LlmError && err.code === 'unreachable') {
        status = { enabled: false, model, reason: 'unreachable' }
        return { ok: false, reason: 'unreachable', error }
      }
      return { ok: false, reason: 'error', error }
    }
  }

  return { init, chat, status: (): AgentStatus => status }
}

export type AgentService = ReturnType<typeof createAgentService>
