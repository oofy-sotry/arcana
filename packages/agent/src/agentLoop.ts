// 에이전트 루프 — 모델 호출 → tool 실행 → 결과 전달을 반복하고, 단계 수가 maxSteps를 넘으면 멈춘다.
// tool 오류는 예외로 끊지 않고 {error}로 모델에 돌려줘서 펫 말투로 설명하게 한다
import type { ChatClient, ChatMessage, ChatUsage } from './llmClient'
import { toToolSpec, validateArgs, type ToolArgs, type ToolDefinition } from './tools'

export interface ToolCallEvent {
  name:   string
  args:   ToolArgs | null
  result: unknown
  ok:     boolean
}

export interface AgentRunOptions {
  client:        ChatClient
  model:         string
  messages:      ChatMessage[]
  tools:         ToolDefinition[]
  maxSteps:      number
  /** 단계 상한에 걸렸을 때 사용자에게 보여줄 문구 */
  maxStepsReply: string
  onToken?:      (token: string) => void
  onToolCall?:   (event: ToolCallEvent) => void
  signal?:       AbortSignal
}

export interface AgentRunResult {
  reply:     string
  /** 모델 호출 횟수 */
  steps:     number
  toolCalls: number
  stoppedBy: 'answer' | 'max_steps'
  usage:     ChatUsage
  /** 첫 호출의 첫 토큰까지 ms */
  firstTokenMs?: number
  messages:  ChatMessage[]
}

async function executeTool(tools: ToolDefinition[], name: string, rawArgs: string): Promise<ToolCallEvent> {
  const tool = tools.find(t => t.name === name)
  if (!tool) return { name, args: null, result: { error: `없는 tool입니다: ${name}` }, ok: false }

  const validated = validateArgs(tool.parameters, rawArgs)
  if (!validated.ok) return { name, args: null, result: { error: validated.error }, ok: false }

  const { args } = validated
  const reason = tool.check?.(args)
  if (reason) return { name, args, result: { error: reason }, ok: false }

  try {
    return { name, args, result: await tool.run(args), ok: true }
  } catch (err) {
    return { name, args, result: { error: `실행 실패: ${(err as Error).message}` }, ok: false }
  }
}

export async function runAgent(opts: AgentRunOptions): Promise<AgentRunResult> {
  const { client, model, tools, maxSteps, maxStepsReply, onToken, onToolCall, signal } = opts
  const messages: ChatMessage[] = [...opts.messages]
  const specs = tools.map(toToolSpec)
  const usage: ChatUsage = { promptTokens: 0, completionTokens: 0 }
  let toolCalls = 0
  let firstTokenMs: number | undefined

  for (let step = 1; step <= maxSteps; step++) {
    const res = await client.chat({ model, messages, tools: specs, onToken, signal })
    if (res.usage) {
      usage.promptTokens     += res.usage.promptTokens
      usage.completionTokens += res.usage.completionTokens
    }
    if (step === 1) firstTokenMs = res.firstTokenMs

    if (res.toolCalls.length === 0) {
      messages.push({ role: 'assistant', content: res.content })
      return { reply: res.content, steps: step, toolCalls, stoppedBy: 'answer', usage, firstTokenMs, messages }
    }

    messages.push({ role: 'assistant', content: res.content || null, tool_calls: res.toolCalls })
    for (const call of res.toolCalls) {
      toolCalls++
      const event = await executeTool(tools, call.function.name, call.function.arguments)
      onToolCall?.(event)
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(event.result ?? null) })
    }
  }

  return { reply: maxStepsReply, steps: maxSteps, toolCalls, stoppedBy: 'max_steps', usage, firstTokenMs, messages }
}
