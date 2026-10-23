// OpenAI 호환 Chat Completions 클라이언트 — Ollama(/v1)와 GitHub Models가 같은 형식이라
// 공급자는 baseURL·apiKey만 바꿔 끼운다. 응답은 SSE 스트리밍으로 받아 토큰마다 onToken 호출
export interface ToolCall {
  id:       string
  type:     'function'
  function: { name: string; arguments: string }
}

export interface ChatMessage {
  role:          'system' | 'user' | 'assistant' | 'tool'
  content:       string | null
  tool_calls?:   ToolCall[]
  tool_call_id?: string
}

export interface ToolSpec {
  type:     'function'
  function: { name: string; description: string; parameters: object }
}

export interface ChatUsage {
  promptTokens:     number
  completionTokens: number
}

export interface ChatResult {
  content:       string
  toolCalls:     ToolCall[]
  usage?:        ChatUsage
  /** 요청부터 첫 토큰(내용 또는 tool 호출)까지 ms */
  firstTokenMs?: number
  totalMs:       number
}

export interface ChatRequest {
  model:    string
  messages: ChatMessage[]
  tools?:   ToolSpec[]
  onToken?: (token: string) => void
  signal?:  AbortSignal
}

export interface ChatClient {
  chat(req: ChatRequest): Promise<ChatResult>
  /** 공급자에 연결되는지 확인 (GET /models) */
  ping(): Promise<boolean>
}

export class LlmError extends Error {
  /** HTTP 상태 — 429면 무료 한도 초과 */
  status?: number
  /** 'unreachable' = 연결 자체 실패 */
  code?:   string
  constructor(message: string, { status, code }: { status?: number; code?: string } = {}) {
    super(message)
    this.name   = 'LlmError'
    this.status = status
    this.code   = code
  }
}

interface ClientOptions {
  baseURL:    string
  apiKey?:    string
  fetchImpl?: typeof fetch
  now?:       () => number
}

export function createChatClient({ baseURL, apiKey, fetchImpl = fetch, now = Date.now }: ClientOptions): ChatClient {
  const root    = baseURL.replace(/\/+$/, '')
  const headers = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  })

  async function chat({ model, messages, tools, onToken, signal }: ChatRequest): Promise<ChatResult> {
    const startedAt = now()
    const body = {
      model,
      messages,
      ...(tools && tools.length ? { tools } : {}),
      stream: true,
      stream_options: { include_usage: true },
    }

    let res: Response
    try {
      res = await fetchImpl(`${root}/chat/completions`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal })
    } catch (err) {
      throw new LlmError(`LLM 공급자에 연결할 수 없습니다: ${root} (${(err as Error).message})`, { code: 'unreachable' })
    }
    if (!res.ok || !res.body) {
      const text = (await res.text().catch(() => '')).slice(0, 300)
      throw new LlmError(`LLM 요청 실패 (${res.status}): ${text}`, { status: res.status })
    }

    let content = ''
    let usage: ChatUsage | undefined
    let firstTokenMs: number | undefined
    const calls: ToolCall[] = []
    const markFirst = () => { if (firstTokenMs === undefined) firstTokenMs = now() - startedAt }

    const handleData = (data: string) => {
      if (data === '[DONE]') return
      const chunk = JSON.parse(data)
      if (chunk.usage) usage = { promptTokens: chunk.usage.prompt_tokens, completionTokens: chunk.usage.completion_tokens }
      const delta = chunk.choices?.[0]?.delta
      if (!delta) return
      if (delta.content) {
        markFirst()
        content += delta.content
        onToken?.(delta.content)
      }
      for (const tc of delta.tool_calls ?? []) {
        markFirst()
        const call = calls[tc.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } }
        if (tc.id) call.id = tc.id
        if (tc.function?.name) call.function.name += tc.function.name
        if (tc.function?.arguments) call.function.arguments += tc.function.arguments
      }
    }

    // SSE — 네트워크 청크가 줄 중간에서 끊길 수 있어 마지막 미완성 줄은 다음 청크와 합친다
    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data:')) handleData(line.slice(5).trim())
      }
    }
    if (buffer.startsWith('data:')) handleData(buffer.slice(5).trim())

    return { content, toolCalls: calls.filter(Boolean), usage, firstTokenMs, totalMs: now() - startedAt }
  }

  async function ping(): Promise<boolean> {
    try {
      const res = await fetchImpl(`${root}/models`, { headers: headers(), signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  }

  return { chat, ping }
}
