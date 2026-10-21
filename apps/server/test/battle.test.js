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

function challenge(token, body) {
  return fetch(`${baseUrl}/battle/challenge`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }))
}

test('POST /battle/challenge — 필드 누락 시 400', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await challenge(token, {})
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'missing_fields')
})

test('POST /battle/challenge — 존재하지 않는 상대면 404', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await challenge(token, { targetUsername: 'nobody', myPet: { name: 'mine', hp: 50, attack: 10, defense: 5 } })
  assert.equal(res.status, 404)
  assert.equal((await res.json()).error, 'user_not_found')
})

test('POST /battle/challenge — 자기 자신에게 도전하면 400', async () => {
  const { token, username } = await registerUser(baseUrl)
  const res = await challenge(token, { targetUsername: username, myPet: { name: 'mine', hp: 50, attack: 10, defense: 5 } })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'cannot_battle_self')
})

test('POST /battle/challenge — 상대가 펫을 동기화한 적 없으면 400', async () => {
  const attacker = await registerUser(baseUrl)
  const target    = await registerUser(baseUrl)
  const res = await challenge(attacker.token, { targetUsername: target.username, myPet: { name: 'mine', hp: 50, attack: 10, defense: 5 } })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'target_has_no_pets')
})

test('POST /battle/challenge — 압도적으로 강하면 승리하고 배틀 기록에 남음', async () => {
  const attacker = await registerUser(baseUrl)
  const target    = await registerUser(baseUrl)
  await sync(target.token, [{ name: 'weak', hp: 1, attack: 1, defense: 0, level: 1, evolution_stage: 0 }])

  const res  = await challenge(attacker.token, {
    targetUsername: target.username,
    myPet: { name: 'strong', hp: 1000, attack: 1000, defense: 1000 },
  })
  const data = await res.json()
  assert.equal(res.status, 200)
  assert.equal(data.winner, 'attacker')
  assert.equal(data.defUsername, target.username)

  const historyRes  = await fetch(`${baseUrl}/battle/history`, authed(attacker.token))
  const historyData = await historyRes.json()
  assert.ok(historyData.history.some(h => h.defender_username === target.username && h.won === true))
})

test('GET /battle/ranking — 승패 집계 반환', async () => {
  const attacker = await registerUser(baseUrl)
  const target    = await registerUser(baseUrl)
  await sync(target.token, [{ name: 'weak', hp: 1, attack: 1, defense: 0 }])
  await challenge(attacker.token, {
    targetUsername: target.username,
    myPet: { name: 'strong', hp: 1000, attack: 1000, defense: 1000 },
  })

  const res  = await fetch(`${baseUrl}/battle/ranking`, authed(attacker.token))
  const data = await res.json()
  const attackerEntry = data.ranking.find(r => r.username === attacker.username)
  assert.ok(attackerEntry)
  assert.ok(attackerEntry.wins >= 1)
})

test('GET /battle/history — 인증 없이 요청하면 401', async () => {
  const res = await fetch(`${baseUrl}/battle/history`)
  assert.equal(res.status, 401)
})
