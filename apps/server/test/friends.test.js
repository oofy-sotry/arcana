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

function addFriend(token, username) {
  return fetch(`${baseUrl}/friends`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username }),
  }))
}

test('GET /friends — 친구가 없으면 빈 목록', async () => {
  const { token } = await registerUser(baseUrl)
  const res  = await fetch(`${baseUrl}/friends`, authed(token))
  const data = await res.json()
  assert.deepEqual(data.friends, [])
})

test('POST /friends — username 누락 시 400', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await addFriend(token, undefined)
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'missing_username')
})

test('POST /friends — 존재하지 않는 유저면 404', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await addFriend(token, 'nobody')
  assert.equal(res.status, 404)
  assert.equal((await res.json()).error, 'user_not_found')
})

test('POST /friends — 자기 자신을 추가하면 400', async () => {
  const { token, username } = await registerUser(baseUrl)
  const res = await addFriend(token, username)
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'cannot_add_self')
})

test('POST /friends — 정상 추가 시 목록에 반영되고 중복 추가는 409', async () => {
  const me     = await registerUser(baseUrl)
  const friend = await registerUser(baseUrl)

  const res  = await addFriend(me.token, friend.username)
  assert.equal(res.status, 200)

  const listRes  = await fetch(`${baseUrl}/friends`, authed(me.token))
  const listData = await listRes.json()
  assert.ok(listData.friends.some(f => f.username === friend.username))

  const dupRes = await addFriend(me.token, friend.username)
  assert.equal(dupRes.status, 409)
  assert.equal((await dupRes.json()).error, 'already_friends')
})

test('POST /friends — 친구 추가는 단방향(친구관계가 상대방 목록엔 안 보임)', async () => {
  const me     = await registerUser(baseUrl)
  const friend = await registerUser(baseUrl)
  await addFriend(me.token, friend.username)

  const friendListRes  = await fetch(`${baseUrl}/friends`, authed(friend.token))
  const friendListData = await friendListRes.json()
  assert.equal(friendListData.friends.some(f => f.username === me.username), false)
})

test('DELETE /friends/:id — 친구 삭제 후 목록에서 사라짐', async () => {
  const me     = await registerUser(baseUrl)
  const friend = await registerUser(baseUrl)
  await addFriend(me.token, friend.username)

  const before = await (await fetch(`${baseUrl}/friends`, authed(me.token))).json()
  const friendId = before.friends.find(f => f.username === friend.username).id

  const delRes = await fetch(`${baseUrl}/friends/${friendId}`, authed(me.token, { method: 'DELETE' }))
  assert.equal(delRes.status, 200)

  const after = await (await fetch(`${baseUrl}/friends`, authed(me.token))).json()
  assert.equal(after.friends.some(f => f.username === friend.username), false)
})

test('GET /friends/:username/pets — 친구가 아니면 403', async () => {
  const me      = await registerUser(baseUrl)
  const stranger = await registerUser(baseUrl)
  const res = await fetch(`${baseUrl}/friends/${stranger.username}/pets`, authed(me.token))
  assert.equal(res.status, 403)
  assert.equal((await res.json()).error, 'not_friends')
})

test('GET /friends/:username/pets — 존재하지 않는 유저면 404', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await fetch(`${baseUrl}/friends/nobody/pets`, authed(token))
  assert.equal(res.status, 404)
  assert.equal((await res.json()).error, 'user_not_found')
})

test('GET /friends/:username/pets — 친구면 펫 목록 조회 가능', async () => {
  const me     = await registerUser(baseUrl)
  const friend = await registerUser(baseUrl)
  await addFriend(me.token, friend.username)
  await fetch(`${baseUrl}/save/sync`, authed(friend.token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pets: [{ name: 'friendPet', level: 3 }] }),
  }))

  const res  = await fetch(`${baseUrl}/friends/${friend.username}/pets`, authed(me.token))
  const data = await res.json()
  assert.equal(res.status, 200)
  assert.deepEqual(data.pets.map(p => p.name), ['friendPet'])
})
