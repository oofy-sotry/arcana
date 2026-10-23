const { test } = require('node:test')
const assert = require('node:assert/strict')
const { IPC_INVOKE_CHANNELS, IPC_SEND_CHANNELS, IPC_EVENT_CHANNELS } = require('../dist')

const ALL = [...IPC_INVOKE_CHANNELS, ...IPC_SEND_CHANNELS, ...IPC_EVENT_CHANNELS]

test('채널 이름 — 중복 없음', () => {
  assert.equal(new Set(ALL).size, ALL.length)
})

test('채널 이름 — 도메인:동작 형식 (소문자·하이픈)', () => {
  for (const ch of ALL) assert.match(ch, /^[a-z]+:[a-z]+(-[a-z]+)*$/, ch)
})
