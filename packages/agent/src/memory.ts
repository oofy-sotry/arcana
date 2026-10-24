// 대화 기록 — 최근 maxTurns 턴은 원문으로 두고, 더 오래된 턴은 규칙 기반 요약 한 줄로 바꾼다.
// 응답 경로에서 LLM으로 요약하지 않는 이유: 작은 모델(CPU)은 짧은 요청도 수십 초, 큰 모델은 무료 한도를 쓴다.
// 게이트웨이 큐가 켜져 있으면 밀려난 턴을 따로 LLM 요약(summaryRequest → applySummary)하고, 결과가 오기 전까지는 규칙 요약을 쓴다
import type { ChatMessage } from './llmClient'

const USER_CLIP  = 40
const REPLY_CLIP = 60

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

interface Turn { user: string; reply: string }

/** LLM 요약 job에 보낼 내용 — upTo는 applySummary에 그대로 돌려줄 마지막 턴 번호 */
export interface SummaryRequest {
  previous: string | null
  turns:    Turn[]
  upTo:     number
}

export function createConversationMemory({ maxTurns, maxSummaryLines = 6, maxPendingTurns = 20 }: { maxTurns: number; maxSummaryLines?: number; maxPendingTurns?: number }) {
  let recent: Turn[] = []
  // 밀려났지만 아직 LLM 요약에 들어가지 않은 턴 (번호는 계속 늘어남)
  let pending: Array<Turn & { seq: number }> = []
  let llmSummary: string | null = null
  let turns = 0
  let seq = 0
  // clear 전에 보낸 요약 job 결과는 버린다
  let clearedAt = 0

  function add(user: string, reply: string) {
    turns++
    recent.push({ user, reply })
    while (recent.length > maxTurns) {
      pending.push({ ...recent.shift()!, seq: ++seq })
    }
    if (pending.length > maxPendingTurns) pending = pending.slice(-maxPendingTurns)
  }

  const ruleLines = () => pending.slice(-maxSummaryLines)
    .map(t => `- 사용자: ${clip(t.user, USER_CLIP)} → 도우미: ${clip(t.reply, REPLY_CLIP)}`)

  function toMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const summary = [...(llmSummary ? [llmSummary] : []), ...ruleLines()]
    if (summary.length) messages.push({ role: 'system', content: `이전 대화 요약:\n${summary.join('\n')}` })
    for (const t of recent) {
      messages.push({ role: 'user', content: t.user }, { role: 'assistant', content: t.reply })
    }
    return messages
  }

  function summaryRequest(): SummaryRequest | null {
    if (!pending.length) return null
    return { previous: llmSummary, turns: pending.map(({ user, reply }) => ({ user, reply })), upTo: pending.at(-1)!.seq }
  }

  function applySummary(text: string, upTo: number) {
    if (upTo <= clearedAt) return
    llmSummary = text
    pending    = pending.filter(t => t.seq > upTo)
  }

  return {
    add,
    toMessages,
    summaryRequest,
    applySummary,
    stats: () => ({ turns, summarized: ruleLines().length, ...(llmSummary ? { llmSummary: true } : {}) }),
    clear: () => { recent = []; pending = []; llmSummary = null; turns = 0; clearedAt = seq },
  }
}

export type ConversationMemory = ReturnType<typeof createConversationMemory>
