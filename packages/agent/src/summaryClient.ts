// 게이트웨이 요약 job 클라이언트 — 밀려난 대화 턴을 큐에 넣고(POST /jobs/summary), 결과를 조회한다(GET /jobs/:id).
// 응답 경로가 아니므로 실패해도 규칙 요약을 그대로 쓰면 되고, 호출하는 쪽에서 오류를 삼킨다
import type { SummaryRequest } from './memory'

export interface SummaryJob {
  status:   'queued' | 'running' | 'done' | 'failed'
  summary?: string
  error?:   string
}

export class SummaryJobError extends Error {
  /** HTTP 상태 — 연결 자체가 안 되면 undefined */
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name   = 'SummaryJobError'
    this.status = status
  }
}

interface SummaryClientOptions {
  baseURL:    string
  apiKey?:    string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export function createSummaryClient({ baseURL, apiKey, fetchImpl = fetch, timeoutMs = 5000 }: SummaryClientOptions) {
  const root    = baseURL.replace(/\/+$/, '')
  const headers = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  })

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await fetchImpl(`${root}${path}`, { ...init, headers: headers(), signal: AbortSignal.timeout(timeoutMs) })
    } catch (err) {
      throw new SummaryJobError(`게이트웨이에 연결할 수 없습니다: ${root} (${(err as Error).message})`)
    }
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 200)
      throw new SummaryJobError(`요약 job 요청 실패 (${res.status}): ${text}`, res.status)
    }
    return (await res.json()) as T
  }

  async function submit(req: Omit<SummaryRequest, 'upTo'>): Promise<string> {
    const body = await request<{ id: string }>('/jobs/summary', { method: 'POST', body: JSON.stringify({ previous: req.previous, turns: req.turns }) })
    return body.id
  }

  async function get(id: string): Promise<SummaryJob> {
    const body = await request<{ status: SummaryJob['status']; result?: { summary: string }; error?: string }>(`/jobs/${encodeURIComponent(id)}`)
    return {
      status: body.status,
      ...(body.result?.summary !== undefined ? { summary: body.result.summary } : {}),
      ...(body.error !== undefined ? { error: body.error } : {}),
    }
  }

  return { submit, get }
}

export type SummaryClient = ReturnType<typeof createSummaryClient>
