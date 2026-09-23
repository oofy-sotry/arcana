const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startServer, registerUser } = require('./helpers')

let baseUrl, close

before(async () => {
  ({ baseUrl, close } = await startServer())
})

after(async () => {
  await close()
})

function authed(token, opts = {}) {
  return { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } }
}

test('POST /save/sync — 인증 없이 요청하면 401', async () => {
  const res = await fetch(`${baseUrl}/save/sync`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets: [] }),
  })
  assert.equal(res.status, 401)
})

test('POST /save/sync — pets가 빈 배열이면 400', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await fetch(`${baseUrl}/save/sync`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets: [] }),
  }))
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'invalid_data')
})

test('POST /save/sync → GET /save/sync — 업로드한 펫이 그대로 조회됨', async () => {
  const { token } = await registerUser(baseUrl)
  const pets = [{ name: 'starter', level: 1 }, { name: 'friend', level: 2 }]

  const postRes = await fetch(`${baseUrl}/save/sync`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets }),
  }))
  assert.equal(postRes.status, 200)
  assert.equal((await postRes.json()).synced, 2)

  const getRes  = await fetch(`${baseUrl}/save/sync`, authed(token))
  const getData = await getRes.json()
  assert.deepEqual(getData.pets.map(p => p.name).sort(), ['friend', 'starter'])
  assert.ok(getData.synced_at)
})

test('POST /save/sync — 다시 동기화하면 이전 스냅샷을 덮어씀', async () => {
  const { token } = await registerUser(baseUrl)

  await fetch(`${baseUrl}/save/sync`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets: [{ name: 'old' }] }),
  }))
  await fetch(`${baseUrl}/save/sync`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets: [{ name: 'new' }] }),
  }))

  const getRes  = await fetch(`${baseUrl}/save/sync`, authed(token))
  const getData = await getRes.json()
  assert.deepEqual(getData.pets.map(p => p.name), ['new'])
})

test('GET /save/sync — 동기화한 적 없으면 빈 목록과 null synced_at', async () => {
  const { token } = await registerUser(baseUrl)
  const res  = await fetch(`${baseUrl}/save/sync`, authed(token))
  const data = await res.json()
  assert.deepEqual(data.pets, [])
  assert.equal(data.synced_at, null)
})
