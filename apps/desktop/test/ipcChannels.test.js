const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs   = require('fs')
const path = require('path')
const { IPC_INVOKE_CHANNELS, IPC_SEND_CHANNELS } = require('@arcana/shared')

const read = rel => fs.readFileSync(path.join(__dirname, '../src', rel), 'utf8')
const channels = (src, re) => [...src.matchAll(re)].map(m => m[1]).sort()

const router  = read('main/ipcRouter.js')
const preload = read('preload/preload.js')

// @arcana/shared 목록이 실제 코드와 어긋나면 AI 에이전트 등 TS 코드가 없는 채널을 부르게 된다
test('ipcRouter handle 채널 = shared IPC_INVOKE_CHANNELS', () => {
  assert.deepEqual(channels(router, /ipcMain\.handle\('([^']+)'/g), [...IPC_INVOKE_CHANNELS].sort())
})

test('ipcRouter on 채널 = shared IPC_SEND_CHANNELS', () => {
  assert.deepEqual(channels(router, /ipcMain\.on\('([^']+)'/g), [...IPC_SEND_CHANNELS].sort())
})

test('preload invoke 채널 = shared IPC_INVOKE_CHANNELS', () => {
  assert.deepEqual(channels(preload, /ipcRenderer\.invoke\('([^']+)'/g), [...IPC_INVOKE_CHANNELS].sort())
})

test('preload send 채널 = shared IPC_SEND_CHANNELS', () => {
  assert.deepEqual(channels(preload, /ipcRenderer\.send\('([^']+)'/g), [...IPC_SEND_CHANNELS].sort())
})
