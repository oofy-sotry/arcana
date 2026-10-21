const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs   = require('fs')
const path = require('path')

function cspOf(page) {
  const html = fs.readFileSync(path.join(__dirname, `../src/renderer/${page}/index.html`), 'utf8')
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)
  assert.ok(m, `${page}/index.html에 CSP meta가 없음`)
  return Object.fromEntries(m[1].split(';').map(d => d.trim().split(/\s+/)).filter(d => d[0]).map(([k, ...v]) => [k, v]))
}

// RealtimeSocket(실시간 PvP·파티 사냥)이 런처 창에서 서버로 WebSocket을 연다 — connect-src가 없으면 default-src 'self'에 막힘
test('launcher CSP — connect-src가 ws:/wss:를 허용', () => {
  const csp = cspOf('launcher')
  assert.ok(csp['connect-src'], 'connect-src 지시어 없음')
  assert.ok(csp['connect-src'].includes('ws:'))
  assert.ok(csp['connect-src'].includes('wss:'))
})

test('launcher CSP — 스크립트는 여전히 self만', () => {
  assert.deepEqual(cspOf('launcher')['script-src'], ["'self'"])
})
