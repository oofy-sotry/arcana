// 에이전트 서비스 — desktop main이 쓰는 진입점. 요청마다 라우팅(잡담=작은 모델, tool=큰 모델)과
// 컨텍스트 선택을 하고 에이전트 루프를 돌린다. 공급자 문제는 예외 대신 꺼짐 상태나 실패 결과로 돌려줘
// 게임 쪽은 에이전트가 없어도 그대로 동작한다
import { resolveModel, resolveProvider, type AgentConfig } from './config'
import { createChatClient, LlmError, type ChatClient, type ChatMessage, type ChatUsage } from './llmClient'
import { runAgent, type AgentRunResult, type ToolCallEvent } from './agentLoop'
import { createPetTools, type GameApi } from './petTools'
import { routeRequest } from './router'
import { buildContext } from './context'
import { createConversationMemory } from './memory'
import { estimateCostUsd } from './pricing'
import { createSummaryClient as createSummaryClientDefault, type SummaryClient } from './summaryClient'

export const MAX_MESSAGE_LENGTH = 500
/** 잡담 모델이 게임 기능이 필요하다고 판단했을 때 답하는 표시 — 큰 모델로 다시 보낸다 */
export const NEED_TOOLS = 'NEED_TOOLS'

const PLAIN_TEXT = '답은 게임 화면에 글자 그대로 표시되므로 마크다운 기호(**, #, 표) 없이 평문으로 쓴다.'

const TOOL_PROMPT = [
  '너는 데스크톱 펫 RPG "아르카나"에서 플레이어를 돕는 도우미다.',
  '펫 상태·가방·사냥터·파티는 아래 상태나 tool 결과로만 말하고, 추측해서 말하지 않는다.',
  '플레이어가 부탁한 행동만 tool로 실행하고, 한국어로 짧게 답한다.',
  PLAIN_TEXT,
].join('\n')

const CHAT_PROMPT = [
  '너는 데스크톱 펫 RPG "아르카나"에서 플레이어와 이야기하는 도우미다. 한국어로 짧게 답한다.',
  `펫 상태 확인·먹이·아이템·사냥·파티처럼 게임 기능이 필요한 요청이면 다른 말 없이 ${NEED_TOOLS} 라고만 답한다.`,
  '인사·감사·잡담에는 평소처럼 답한다.',
  PLAIN_TEXT,
].join('\n')

const MAX_STEPS_REPLY = '여러 단계를 거쳐도 끝내지 못했어요. 조금 더 구체적으로 부탁해 주세요.'

export type DisabledReason = 'not_ready' | 'no_key' | 'unreachable' | 'bad_config'

export interface AgentStatus {
  enabled:    boolean
  /** tool 요청에 쓰는 큰 모델 */
  model?:     string
  /** 잡담 모델 — 연결할 수 없으면 null (잡담도 큰 모델로) */
  chatModel?: string | null
  reason?:    DisabledReason
}

export interface RouteInfo {
  kind:      'chat' | 'tools'
  modelName: string
  tools:     string[]
  reason:    string
  /** 처음 경로에서 넘긴 이유 */
  fallback?: 'chat_model_needs_tools' | 'chat_model_failed' | 'no_chat_model'
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
      route:         RouteInfo
      /** 프롬프트에 넣은 게임 상태 크기 */
      context:       { chars: number; parts: string[] }
      /** 프롬프트에 넣은 이전 대화 — llmSummary는 게이트웨이 요약 job 결과가 들어갔을 때만 */
      history:       { turns: number; summarized: number; llmSummary?: true }
      /** 무료 한도 초과로 다시 시도한 횟수 */
      retries:       number
      /** 참고 단가표로 환산한 비용(USD) — 단가가 없으면 null */
      costUsd:       number | null
      /** 요청을 받은 때부터 결과까지 */
      totalMs:       number
    }
  | { ok: false; reason: 'disabled' | 'invalid_input' | 'rate_limited' | 'unreachable' | 'error'; error: string }

export interface AgentServiceOptions {
  config:        AgentConfig
  secrets:       Record<string, string>
  env:           Record<string, string | undefined>
  game:          GameApi
  createClient?: (opts: { baseURL: string; apiKey?: string }) => ChatClient
  now?:          () => number
  /**
   * 비교 측정용 — full: 모든 요청을 큰 모델에 tool·상태 전부 / routing: 라우팅만, 상태는 전부 /
   * routing+context(기본): 라우팅 + 컨텍스트 선택
   */
  strategy?:     'full' | 'routing' | 'routing+context'
  createSummaryClient?: (opts: { baseURL: string; apiKey?: string }) => SummaryClient
  /** 요약 job 결과 조회 사이 대기 — 테스트에서 바꿔 끼운다 */
  sleep?:        (ms: number) => Promise<void>
  /** 요약 job 하나가 끝날 때마다 (로그용, 대화 원문 없음) */
  onSummary?:    (event: SummaryEvent) => void
}

export type SummaryEvent = { ok: true; ms: number; turns: number } | { ok: false; ms: number; error: string }

export interface ChatOptions {
  onToken?:    (token: string) => void
  onToolCall?: (event: ToolCallEvent) => void
  signal?:     AbortSignal
}

interface Target { client: ChatClient; model: string }

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// 작은 모델은 표시를 need_tools·Need_Tools. 처럼 바꿔 쓰기도 해서 대소문자를 무시한다
const isNeedTools = (text: string) => text.toUpperCase().includes(NEED_TOOLS)

// 잡담 모델 출력이 NEED_TOOLS 표시인지 판단될 때까지 토큰을 붙잡아 두어 화면에 흘리지 않는다
function holdMarker(onToken?: (token: string) => void) {
  let buffer   = ''
  let released = false
  const push = (token: string) => {
    if (released) return onToken?.(token)
    buffer += token
    const head = buffer.trimStart().toUpperCase()
    if (NEED_TOOLS.startsWith(head) || head.startsWith(NEED_TOOLS)) return
    released = true
    onToken?.(buffer)
  }
  const flush = () => {
    if (released || !buffer || isNeedTools(buffer)) return
    released = true
    onToken?.(buffer)
  }
  return { push, flush }
}

export function createAgentService({
  config, secrets, env, game, createClient = createChatClient, now = Date.now, strategy = 'routing+context',
  createSummaryClient = createSummaryClientDefault, sleep: wait = sleep, onSummary,
}: AgentServiceOptions) {
  let status: AgentStatus = { enabled: false, reason: 'not_ready' }
  let large: Target | undefined
  let small: Target | undefined
  const allTools = createPetTools(game)
  const memory   = createConversationMemory({ maxTurns: config.routing.historyTurns })
  const summarizer = connectSummarizer()
  let summaryTask: Promise<void> | undefined

  // 요약 job — 설정에서 켜고 게이트웨이 키가 있을 때만. 없으면 규칙 요약만 쓴다
  function connectSummarizer(): SummaryClient | undefined {
    if (!config.summary?.enabled) return undefined
    try {
      const p = resolveProvider(config, config.summary.provider, { env, secrets })
      return p.available ? createSummaryClient({ baseURL: p.baseURL, apiKey: p.apiKey }) : undefined
    } catch {
      return undefined
    }
  }

  async function runSummaryJob(client: SummaryClient) {
    const req = memory.summaryRequest()
    if (!req) return
    const started = now()
    try {
      const id = await client.submit(req)
      for (;;) {
        await wait(config.summary.pollMs)
        const job = await client.get(id)
        if (job.status === 'done' && job.summary) {
          memory.applySummary(job.summary, req.upTo)
          onSummary?.({ ok: true, ms: now() - started, turns: req.turns.length })
          return
        }
        if (job.status === 'failed') throw new Error(job.error ?? '요약 job 실패')
        if (now() - started >= config.summary.timeoutMs) throw new Error(`요약 job이 ${config.summary.timeoutMs}ms 시간 안에 끝나지 않음`)
      }
    } catch (err) {
      onSummary?.({ ok: false, ms: now() - started, error: (err as Error).message })
    }
  }

  // 응답을 기다리게 하지 않도록 뒤에서 돌리고, 한 번에 job 하나만
  function summarizeInBackground() {
    if (!summarizer || summaryTask) return
    summaryTask = runSummaryJob(summarizer).finally(() => { summaryTask = undefined })
  }

  async function connectChatModel(): Promise<Target | undefined> {
    try {
      const m = resolveModel(config, config.routing.chatModel, { env, secrets })
      if (!m.available) return undefined
      const client = createClient({ baseURL: m.baseURL, apiKey: m.apiKey })
      return (await client.ping()) ? { client, model: m.model } : undefined
    } catch {
      return undefined
    }
  }

  async function init(): Promise<AgentStatus> {
    let resolved
    try {
      resolved = resolveModel(config, config.defaultModel, { env, secrets })
    } catch {
      return (status = { enabled: false, reason: 'bad_config' })
    }
    if (!resolved.available) return (status = { enabled: false, model: resolved.model, reason: 'no_key' })

    const client = createClient({ baseURL: resolved.baseURL, apiKey: resolved.apiKey })
    if (!(await client.ping())) return (status = { enabled: false, model: resolved.model, reason: 'unreachable' })
    large = { client, model: resolved.model }
    small = await connectChatModel()
    return (status = { enabled: true, model: large.model, chatModel: small?.model ?? null })
  }

  // 한 경로로 실행 — 그 경로에 맞는 컨텍스트와 tool만 넣는다
  async function runRoute(target: Target, route: RouteInfo, text: string, history: ChatMessage[], opts: ChatOptions) {
    const contextRoute = strategy === 'routing+context' ? route : { kind: 'tools' as const, tools: allTools.map(t => t.name) }
    const context = buildContext(game, contextRoute, { maxPets: config.routing.contextMaxPets })
    const prompt  = route.kind === 'chat' ? CHAT_PROMPT : TOOL_PROMPT
    const result  = await runAgent({
      client:        target.client,
      model:         target.model,
      tools:         allTools.filter(t => route.tools.includes(t.name)),
      maxSteps:      config.maxSteps,
      maxStepsReply: MAX_STEPS_REPLY,
      messages:      [{ role: 'system', content: `${prompt}\n\n${context.text}` }, ...history, { role: 'user', content: text }],
      onToken:       opts.onToken,
      onToolCall:    opts.onToolCall,
      signal:        opts.signal,
    })
    return { result, context }
  }

  // 큰 모델 — 무료 한도 초과(429)면 잠시 뒤 한 번 다시
  async function runLarge(route: RouteInfo, text: string, history: ChatMessage[], opts: ChatOptions) {
    try {
      return { ...(await runRoute(large!, route, text, history, opts)), retries: 0 }
    } catch (err) {
      if (!(err instanceof LlmError && err.status === 429)) throw err
      await sleep(config.routing.retryDelayMs)
      return { ...(await runRoute(large!, route, text, history, opts)), retries: 1 }
    }
  }

  async function chat(message: unknown, opts: ChatOptions = {}): Promise<AgentChatResult> {
    const started = now()
    if (!status.enabled || !large) return { ok: false, reason: 'disabled', error: '에이전트가 꺼져 있습니다' }
    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) return { ok: false, reason: 'invalid_input', error: '메시지가 비어 있습니다' }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, reason: 'invalid_input', error: `메시지는 ${MAX_MESSAGE_LENGTH}자까지 보낼 수 있습니다` }
    }

    const decision = strategy === 'full'
      ? { kind: 'tools' as const, modelName: config.defaultModel, tools: allTools.map(t => t.name), reason: 'strategy_full' }
      : routeRequest(text, config)
    const route: RouteInfo = { kind: decision.kind, modelName: decision.modelName, tools: decision.tools, reason: decision.reason }
    const history      = memory.toMessages()
    const historyStats = memory.stats()
    const toolsRoute   = (fallback: RouteInfo['fallback']): RouteInfo =>
      ({ kind: 'tools', modelName: config.defaultModel, tools: allTools.map(t => t.name), reason: route.reason, fallback })

    try {
      let outcome: { result: AgentRunResult; context: { text: string; parts: string[] }; retries: number }
      let finalRoute = route
      let model      = large.model

      if (route.kind === 'chat' && small) {
        // 잡담 모델 — 시간 초과·오류나 NEED_TOOLS 답이면 tool 전체를 주고 큰 모델로 넘긴다
        const held    = holdMarker(opts.onToken)
        const timeout = AbortSignal.timeout(config.routing.chatTimeoutMs)
        const signal  = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout
        let fallback: RouteInfo['fallback']
        let chatRun: Awaited<ReturnType<typeof runRoute>> | undefined
        try {
          chatRun = await runRoute(small, route, text, history, { ...opts, onToken: held.push, signal })
          if (isNeedTools(chatRun.result.reply)) fallback = 'chat_model_needs_tools'
          else held.flush()
        } catch {
          fallback = 'chat_model_failed'
        }
        if (fallback) {
          finalRoute = toolsRoute(fallback)
          outcome    = await runLarge(finalRoute, text, history, opts)
        } else {
          outcome = { ...chatRun!, retries: 0 }
          model   = small.model
        }
      } else {
        if (route.kind === 'chat') finalRoute = { ...route, modelName: config.defaultModel, fallback: 'no_chat_model' }
        outcome = await runLarge(finalRoute, text, history, opts)
      }

      const { result, context, retries } = outcome
      memory.add(text, result.reply)
      summarizeInBackground()
      return {
        ok:           true,
        reply:        result.reply,
        model,
        steps:        result.steps,
        toolCalls:    result.toolCalls,
        stoppedBy:    result.stoppedBy,
        usage:        result.usage,
        firstTokenMs: result.firstTokenMs,
        route:        finalRoute,
        context:      { chars: context.text.length, parts: context.parts },
        history:      historyStats,
        retries,
        costUsd:      estimateCostUsd(config, finalRoute.modelName, result.usage),
        totalMs:      now() - started,
      }
    } catch (err) {
      const error = (err as Error).message
      if (err instanceof LlmError && err.status === 429) return { ok: false, reason: 'rate_limited', error }
      if (err instanceof LlmError && err.code === 'unreachable') {
        status = { enabled: false, model: large.model, reason: 'unreachable' }
        return { ok: false, reason: 'unreachable', error }
      }
      return { ok: false, reason: 'error', error }
    }
  }

  return {
    init,
    chat,
    status: (): AgentStatus => status,
    /** 돌고 있는 요약 job이 끝날 때까지 — 테스트·측정 스크립트용 */
    flushSummary: (): Promise<void> => summaryTask ?? Promise.resolve(),
  }
}

export type AgentService = ReturnType<typeof createAgentService>
