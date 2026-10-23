// 대화 기록 — 최근 maxTurns 턴은 원문으로 두고, 더 오래된 턴은 규칙 기반 요약 한 줄로 바꾼다.
// 요약에 LLM을 쓰지 않는 이유: 작은 모델(CPU)은 짧은 요청도 수십 초, 큰 모델은 무료 한도를 쓴다
import type { ChatMessage } from './llmClient'

const USER_CLIP  = 40
const REPLY_CLIP = 60

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

export function createConversationMemory({ maxTurns, maxSummaryLines = 6 }: { maxTurns: number; maxSummaryLines?: number }) {
  let recent: Array<{ user: string; reply: string }> = []
  let summary: string[] = []
  let turns = 0

  function add(user: string, reply: string) {
    turns++
    recent.push({ user, reply })
    while (recent.length > maxTurns) {
      const old = recent.shift()!
      summary.push(`- 사용자: ${clip(old.user, USER_CLIP)} → 도우미: ${clip(old.reply, REPLY_CLIP)}`)
    }
    if (summary.length > maxSummaryLines) summary = summary.slice(-maxSummaryLines)
  }

  function toMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    if (summary.length) messages.push({ role: 'system', content: `이전 대화 요약:\n${summary.join('\n')}` })
    for (const t of recent) {
      messages.push({ role: 'user', content: t.user }, { role: 'assistant', content: t.reply })
    }
    return messages
  }

  return {
    add,
    toMessages,
    stats: () => ({ turns, summarized: summary.length }),
    clear: () => { recent = []; summary = []; turns = 0 },
  }
}

export type ConversationMemory = ReturnType<typeof createConversationMemory>
