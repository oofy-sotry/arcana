const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startServer } = require('./helpers')

let baseUrl, close

before(async () => {
  ({ baseUrl, close } = await startServer())
})

after(async () => {
  await close()
})

function register(body) {
  return fetch(`${baseUrl}/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

function login(body) {
  return fetch(`${baseUrl}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

test('POST /auth/register — 정상 가입 시 토큰과 username 반환', async () => {
  const res  = await register({ username: 'alice', email: 'alice@test.com', password: 'password123' })
  const data = await res.json()
  assert.equal(res.status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.username, 'alice')
  assert.ok(data.token)
})

test('POST /auth/register — 필드 누락 시 400', async () => {
  const res = await register({ username: 'bob', email: 'bob@test.com' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'missing_fields')
})

test('POST /auth/register — username 3자 미만이면 400', async () => {
  const res = await register({ username: 'ab', email: 'ab@test.com', password: 'password123' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'username_length')
})

test('POST /auth/register — password 6자 미만이면 400', async () => {
  const res = await register({ username: 'carol', email: 'carol@test.com', password: '123' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'password_too_short')
})

test('POST /auth/register — 이메일 형식이 아니면 400', async () => {
  const res = await register({ username: 'dave', email: 'not-an-email', password: 'password123' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'invalid_email')
})

test('POST /auth/register — 이메일/username 중복이면 409', async () => {
  await register({ username: 'erin', email: 'erin@test.com', password: 'password123' })
  const res = await register({ username: 'erin', email: 'erin@test.com', password: 'password123' })
  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'already_exists')
})

test('POST /auth/login — 정상 로그인 시 토큰 반환', async () => {
  await register({ username: 'frank', email: 'frank@test.com', password: 'password123' })
  const res  = await login({ email: 'frank@test.com', password: 'password123' })
  const data = await res.json()
  assert.equal(res.status, 200)
  assert.equal(data.username, 'frank')
  assert.ok(data.token)
})

test('POST /auth/login — 비밀번호가 틀리면 401', async () => {
  await register({ username: 'grace', email: 'grace@test.com', password: 'password123' })
  const res = await login({ email: 'grace@test.com', password: 'wrongpassword' })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, 'invalid_credentials')
})

test('POST /auth/login — 존재하지 않는 이메일이면 401', async () => {
  const res = await login({ email: 'nobody@test.com', password: 'password123' })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, 'invalid_credentials')
})
