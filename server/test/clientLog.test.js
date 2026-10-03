const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startServer, registerUser } = require('./helpers')

let baseUrl, close
const warned = []
const origWarn = console.warn

before(async () => {
  ({ baseUrl, close } = await startServer())
  console.warn = (...a) => warned.push(a.join(' '))
})

after(async () => {
  console.warn = origWarn
  await close()
})

function post(body, headers = {}) {
  return fetch(`${baseUrl}/client-log`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  })
}

test('POST /client-log — message 없으면 400', async () => {
  const res = await post({ level: 'error' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'message_required')
})

test('POST /client-log — 비로그인 에러도 anonymous로 서버 로그에 남음', async () => {
  const res = await post({ level: 'error', message: 'boom', source: 'hunting.js:1', version: '0.2.1' })
  assert.equal(res.status, 200)
  const line = warned.at(-1)
  assert.match(line, /\[CLIENT error\]/)
  assert.match(line, /user=anonymous/)
  assert.match(line, /src=hunting\.js:1 boom/)
})

test('POST /client-log — 토큰이 있으면 username 표기', async () => {
  const u = await registerUser(baseUrl)
  await post({ message: 'with user' }, { Authorization: `Bearer ${u.token}` })
  assert.match(warned.at(-1), new RegExp(`user=${u.username}`))
})

test('POST /client-log — IP당 분당 30건 초과 시 429', async () => {
  let last
  for (let i = 0; i < 31; i++) last = await post({ message: `m${i}` })
  assert.equal(last.status, 429)
})
