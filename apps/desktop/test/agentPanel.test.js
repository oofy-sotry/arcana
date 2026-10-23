const { test } = require('node:test')
const assert = require('node:assert/strict')
const AgentPanel = require('../src/renderer/launcher/components/AgentPanel')

test('statusText — 켜짐은 모델 이름, 꺼짐은 이유별 안내', () => {
  assert.equal(AgentPanel.statusText({ enabled: true, model: 'gemini-x' }), '켜짐 · gemini-x')
  for (const reason of ['no_key', 'unreachable', 'bad_config', 'not_ready']) {
    const text = AgentPanel.statusText({ enabled: false, reason })
    assert.match(text, /^꺼짐 · /, reason)
    assert.notEqual(text, '꺼짐 · ' + reason, `${reason}은 사람이 읽을 문장으로`)
  }
  assert.match(AgentPanel.statusText({ enabled: false, reason: 'no_key' }), /agent-secrets\.json/)
})

test('toolLabel — 펫 tool 6개는 한국어 이름, 모르는 이름은 그대로', () => {
  for (const name of ['get_pets', 'get_inventory', 'use_item', 'get_hunting_zones', 'start_auto_hunt', 'get_party']) {
    assert.notEqual(AgentPanel.toolLabel(name), name, name)
  }
  assert.equal(AgentPanel.toolLabel('mystery'), 'mystery')
})

test('failText — 한도 초과·연결 끊김·꺼짐은 안내 문구, 입력 오류는 서버 메시지 그대로', () => {
  assert.match(AgentPanel.failText({ ok: false, reason: 'rate_limited', error: 'x' }), /한도/)
  assert.match(AgentPanel.failText({ ok: false, reason: 'unreachable', error: 'x' }), /연결/)
  assert.match(AgentPanel.failText({ ok: false, reason: 'disabled', error: 'x' }), /꺼져/)
  assert.equal(AgentPanel.failText({ ok: false, reason: 'invalid_input', error: '메시지가 비어 있습니다' }), '메시지가 비어 있습니다')
  assert.match(AgentPanel.failText({ ok: false, reason: 'error', error: 'boom' }), /boom/)
})

test('metaText — 모델·tool 횟수·단계·토큰·첫 토큰 시간', () => {
  const text = AgentPanel.metaText({
    ok: true, model: 'gemini-x', toolCalls: 2, steps: 3,
    usage: { promptTokens: 1200, completionTokens: 40 }, firstTokenMs: 840,
  })
  assert.equal(text, 'gemini-x · tool 2번 · 3단계 · 토큰 1200/40 · 첫 토큰 0.8초')
  assert.equal(AgentPanel.metaText({ ok: true, model: 'm', toolCalls: 0, steps: 1, usage: { promptTokens: 5, completionTokens: 1 } }),
    'm · tool 0번 · 1단계 · 토큰 5/1')
})

test('turnsOff — 연결 끊김·꺼짐 결과면 패널 입력도 끈다, 한도 초과·입력 오류는 유지', () => {
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'unreachable' }), true)
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'disabled' }), true)
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'rate_limited' }), false)
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'invalid_input' }), false)
  assert.equal(AgentPanel.turnsOff({ ok: true }), false)
})
