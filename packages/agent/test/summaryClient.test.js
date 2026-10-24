const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createSummaryClient, SummaryJobError } = require('../dist')

function fakeFetch(responses) {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, ...init, body: init.body ? JSON.parse(init.body) : undefined })
    const r = responses.shift()
    if (r instanceof Error) throw r
    return new Response(JSON.stringify(r.body), { status: r.status })
  }
  return { fetchImpl, calls }
}

const REQ = { previous: null, turns: [{ user: '밥 줘', reply: '사과를 먹였어요' }] }

test('submit — POST /jobs/summary에 토큰과 함께 보내고 id를 돌려줌', async () => {
  const { fetchImpl, calls } = fakeFetch([{ status: 202, body: { id: 'job1', status: 'queued' } }])
  const client = createSummaryClient({ baseURL: 'http://gw/v1/', apiKey: 'tok', fetchImpl })
  assert.equal(await client.submit(REQ), 'job1')
  assert.equal(calls[0].url, 'http://gw/v1/jobs/summary')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].headers.Authorization, 'Bearer tok')
  assert.deepEqual(calls[0].body, REQ)
})

test('get — 끝난 job은 요약 글을 돌려줌', async () => {
  const { fetchImpl, calls } = fakeFetch([{ status: 200, body: { id: 'job1', kind: 'summary', status: 'done', result: { summary: '사과를 먹였다' } } }])
  const client = createSummaryClient({ baseURL: 'http://gw/v1', apiKey: 'tok', fetchImpl })
  assert.deepEqual(await client.get('job1'), { status: 'done', summary: '사과를 먹였다' })
  assert.equal(calls[0].url, 'http://gw/v1/jobs/job1')
})

test('get — 진행 중·실패 상태', async () => {
  const { fetchImpl } = fakeFetch([
    { status: 200, body: { id: 'j', kind: 'summary', status: 'running' } },
    { status: 200, body: { id: 'j', kind: 'summary', status: 'failed', error: '공급자 429' } },
  ])
  const client = createSummaryClient({ baseURL: 'http://gw/v1', fetchImpl })
  assert.deepEqual(await client.get('j'), { status: 'running' })
  assert.deepEqual(await client.get('j'), { status: 'failed', error: '공급자 429' })
})

test('id는 주소에 넣기 전에 인코딩', async () => {
  const { fetchImpl, calls } = fakeFetch([{ status: 200, body: { status: 'queued' } }])
  await createSummaryClient({ baseURL: 'http://gw/v1', fetchImpl }).get('a/b')
  assert.equal(calls[0].url, 'http://gw/v1/jobs/a%2Fb')
})

test('오류 응답은 상태 코드를 담은 SummaryJobError', async () => {
  const { fetchImpl } = fakeFetch([{ status: 503, body: { error: { message: '작업 큐를 쓸 수 없습니다' } } }])
  const client = createSummaryClient({ baseURL: 'http://gw/v1', fetchImpl })
  await assert.rejects(client.submit(REQ), err => err instanceof SummaryJobError && err.status === 503)
})

test('연결 실패도 SummaryJobError', async () => {
  const { fetchImpl } = fakeFetch([new TypeError('fetch failed')])
  const client = createSummaryClient({ baseURL: 'http://gw/v1', fetchImpl })
  await assert.rejects(client.get('j'), err => err instanceof SummaryJobError && err.status === undefined)
})
