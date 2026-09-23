const http = require('http')
const db   = require('../db/database')
const app  = require('../app')

// 인메모리 DB로 실제 라우트를 태우는 HTTP 서버를 띄운다(테스트 파일당 1회 호출).
// node --test는 매치되는 테스트 파일을 별도 프로세스로 실행하므로 db.js의
// 모듈 전역 상태가 파일 간에 섞이지 않는다.
async function startServer() {
  await db.init(':memory:')
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, resolve))
  const { port } = server.address()
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  }
}

// /auth/register를 실제로 태워 유저를 만들고 토큰을 받는다.
async function registerUser(baseUrl, overrides = {}) {
  const unique = Math.random().toString(36).slice(2, 8)
  const body = {
    username: overrides.username || `user_${unique}`,
    email:    overrides.email    || `${unique}@test.com`,
    password: overrides.password || 'password123',
  }
  const res  = await fetch(`${baseUrl}/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  return { ...body, token: data.token }
}

module.exports = { startServer, registerUser }
