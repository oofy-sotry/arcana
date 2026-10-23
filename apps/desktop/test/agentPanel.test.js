const { test } = require('node:test')
const assert = require('node:assert/strict')
const AgentPanel = require('../src/renderer/launcher/components/AgentPanel')

test('statusText — 켜짐은 모델 이름, 꺼짐은 이유별 안내', () => {
  assert.equal(AgentPanel.statusText({ enabled: true, model: 'gemini-x', chatModel: 'qwen' }), '켜짐 · gemini-x (잡담: qwen)')
  assert.equal(AgentPanel.statusText({ enabled: true, model: 'gemini-x', chatModel: null }), '켜짐 · gemini-x (잡담도 이 모델)')
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

const meta = extra => ({
  ok: true, model: 'gemini-x', toolCalls: 2, steps: 3, usage: { promptTokens: 1200, completionTokens: 40 }, firstTokenMs: 840,
  route: { kind: 'tools', tools: ['get_pets', 'use_item'] }, context: { chars: 245 }, ...extra,
})

test('metaText — 모델·경로(tool 수)·상태 크기·tool 횟수·단계·토큰·첫 토큰 시간', () => {
  assert.equal(AgentPanel.metaText(meta()), 'gemini-x · tool 2개 · 상태 245자 · tool 2번 · 3단계 · 토큰 1200/40 · 첫 토큰 0.8초')
  assert.equal(AgentPanel.metaText(meta({ model: 'm', toolCalls: 0, steps: 1, usage: { promptTokens: 5, completionTokens: 1 }, firstTokenMs: undefined,
    route: { kind: 'chat', tools: [] }, context: { chars: 12 } })),
    'm · 잡담 · 상태 12자 · tool 0번 · 1단계 · 토큰 5/1')
})

test('metaText — 처음 경로에서 넘긴 경우 이유를 덧붙임', () => {
  assert.match(AgentPanel.metaText(meta({ route: { kind: 'tools', tools: ['get_pets'], fallback: 'chat_model_needs_tools' } })), / · 잡담 모델이 tool 필요로 판단해 넘김$/)
  assert.match(AgentPanel.metaText(meta({ route: { kind: 'tools', tools: ['get_pets'], fallback: 'chat_model_failed' } })), / · 잡담 모델 실패로 넘김$/)
  assert.match(AgentPanel.metaText(meta({ retries: 1 })), / · 한도 초과로 1번 다시 시도$/)
})

test('turnsOff — 연결 끊김·꺼짐 결과면 패널 입력도 끈다, 한도 초과·입력 오류는 유지', () => {
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'unreachable' }), true)
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'disabled' }), true)
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'rate_limited' }), false)
  assert.equal(AgentPanel.turnsOff({ ok: false, reason: 'invalid_input' }), false)
  assert.equal(AgentPanel.turnsOff({ ok: true }), false)
})

test('statsLines — 전체 건수·실패·누적 환산 비용, 모델별 호출 수·평균 지연·토큰·비용', () => {
  assert.deepEqual(AgentPanel.statsLines({
    total: 5, failed: 1, totalCostUsd: 0.0061234,
    byModel: [
      { model: 'gemini-x', count: 3, avgTotalMs: 2450, avgFirstTokenMs: 812, promptTokens: 9000, completionTokens: 300, costUsd: 0.0061234 },
      { model: 'qwen', count: 1, avgTotalMs: 15000, avgFirstTokenMs: null, promptTokens: 120, completionTokens: 9, costUsd: 0 },
    ],
  }), [
    '전체 5건 (실패 1) · 환산 비용 $0.0061',
    'gemini-x: 3건 · 평균 2.5초 (첫 토큰 0.8초) · 토큰 9000/300 · $0.0061',
    'qwen: 1건 · 평균 15.0초 (첫 토큰 -) · 토큰 120/9 · $0.0000',
  ])
})

test('statsLines — 기록이 없으면 안내 한 줄', () => {
  assert.deepEqual(AgentPanel.statsLines({ total: 0, failed: 0, totalCostUsd: 0, byModel: [] }), ['아직 기록이 없어요'])
})
