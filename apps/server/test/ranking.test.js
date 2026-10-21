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

async function sync(token, pets) {
  await fetch(`${baseUrl}/save/sync`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets }),
  }))
}

test('GET /ranking/:category — 유효하지 않은 카테고리면 400', async () => {
  const res = await fetch(`${baseUrl}/ranking/invalid`)
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'invalid_category')
})

test('GET /ranking/level — 최고 레벨 내림차순 정렬', async () => {
  const low  = await registerUser(baseUrl)
  const high = await registerUser(baseUrl)
  await sync(low.token,  [{ name: 'a', level: 3, evolution_stage: 0 }])
  await sync(high.token, [{ name: 'b', level: 9, evolution_stage: 1 }])

  const res  = await fetch(`${baseUrl}/ranking/level`)
  const data = await res.json()
  assert.equal(data.category, 'level')
  const usernames = data.ranking.map(r => r.username)
  assert.ok(usernames.indexOf(high.username) < usernames.indexOf(low.username))
  const highEntry = data.ranking.find(r => r.username === high.username)
  assert.equal(highEntry.max_level, 9)
  assert.equal(highEntry.total_pets, 1)
})

test('GET /ranking/stage — 최고 진화단계 내림차순 정렬', async () => {
  const low  = await registerUser(baseUrl)
  const high = await registerUser(baseUrl)
  await sync(low.token,  [{ name: 'a', level: 1, evolution_stage: 0 }])
  await sync(high.token, [{ name: 'b', level: 1, evolution_stage: 4 }])

  const res  = await fetch(`${baseUrl}/ranking/stage`)
  const data = await res.json()
  const usernames = data.ranking.map(r => r.username)
  assert.ok(usernames.indexOf(high.username) < usernames.indexOf(low.username))
})

test('GET /ranking/collection — 보유 펫 수 내림차순 정렬', async () => {
  const few  = await registerUser(baseUrl)
  const many = await registerUser(baseUrl)
  await sync(few.token,  [{ name: 'a', level: 1 }])
  await sync(many.token, [{ name: 'b', level: 1 }, { name: 'c', level: 1 }, { name: 'd', level: 1 }])

  const res  = await fetch(`${baseUrl}/ranking/collection`)
  const data = await res.json()
  const manyEntry = data.ranking.find(r => r.username === many.username)
  assert.equal(manyEntry.total_pets, 3)
  const usernames = data.ranking.map(r => r.username)
  assert.ok(usernames.indexOf(many.username) < usernames.indexOf(few.username))
})
