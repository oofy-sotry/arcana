// 도우미 탭 — AI 펫 에이전트와 대화. 답변은 토큰이 오는 대로 그리고, tool 실행은 작은 줄로 보여준다.
// 모델 출력은 textContent로만 넣는다 (innerHTML 금지)
const AGENT_TOOL_LABELS = {
  get_pets:          '펫 상태 확인',
  get_inventory:     '가방 확인',
  use_item:          '아이템 사용',
  get_hunting_zones: '사냥터 찾기',
  start_auto_hunt:   '자동 사냥',
  get_party:         '파티 확인',
}

const AGENT_DISABLED_TEXT = {
  no_key:      'API 키가 없어요 (환경변수 GEMINI_API_KEY 또는 agent-secrets.json의 geminiKey)',
  unreachable: 'AI 공급자에 연결할 수 없어요. 게임은 그대로 할 수 있어요',
  bad_config:  '에이전트 설정 파일(agent.json)을 읽을 수 없어요',
  not_ready:   '준비 중이에요',
}

class AgentPanel {
  /** @param status agent:status 결과  @param api window.arcana.agent */
  constructor(status, api) {
    this.status = status
    this.api    = api
    this.busy   = false
  }

  static statusText(status) {
    if (status.enabled) return `켜짐 · ${status.model}`
    return `꺼짐 · ${AGENT_DISABLED_TEXT[status.reason] || AGENT_DISABLED_TEXT.not_ready}`
  }

  static toolLabel(name) {
    return AGENT_TOOL_LABELS[name] || name
  }

  static failText(res) {
    if (res.reason === 'rate_limited')  return '무료 사용 한도를 넘었어요. 잠시 뒤에 다시 물어봐 주세요'
    if (res.reason === 'unreachable')   return 'AI 공급자와 연결이 끊겼어요. 도우미가 꺼졌어요'
    if (res.reason === 'disabled')      return '도우미가 꺼져 있어요'
    if (res.reason === 'invalid_input') return res.error
    return `오류가 났어요: ${res.error}`
  }

  static metaText(res) {
    const parts = [
      res.model,
      `tool ${res.toolCalls}번`,
      `${res.steps}단계`,
      `토큰 ${res.usage.promptTokens}/${res.usage.completionTokens}`,
    ]
    if (res.firstTokenMs !== undefined) parts.push(`첫 토큰 ${(res.firstTokenMs / 1000).toFixed(1)}초`)
    return parts.join(' · ')
  }

  // 입력·버튼을 함께 켜고 끈다. 꺼진 버튼은 흐리게 해서 누를 수 없다는 게 보이게
  _setEnabled(input, button, on) {
    input.disabled = button.disabled = !on
    button.style.opacity = on ? '1' : '0.4'
    button.style.cursor  = on ? 'pointer' : 'default'
  }

  _bubble(log, who) {
    const el = document.createElement('div')
    const mine = who === 'user'
    el.style.cssText = `max-width:85%; padding:8px 10px; border-radius:8px; font-size:13px; line-height:1.5; white-space:pre-wrap;
      align-self:${mine ? 'flex-end' : 'flex-start'}; background:${mine ? '#0f3460' : '#16213e'}; border:1px solid #0f3460`
    log.appendChild(el)
    log.scrollTop = log.scrollHeight
    return el
  }

  _note(log, text, color = '#888') {
    const el = document.createElement('div')
    el.style.cssText = `font-size:11px; color:${color}; align-self:flex-start; padding-left:4px`
    el.textContent = text
    log.appendChild(el)
    log.scrollTop = log.scrollHeight
    return el
  }

  async _send(log, input, button) {
    const message = input.value.trim()
    if (!message || this.busy) return
    this.busy = true
    input.value = ''
    this._setEnabled(input, button, false)

    this._bubble(log, 'user').textContent = message
    const reply = this._bubble(log, 'agent')
    reply.textContent = '…'
    let streamed = ''

    try {
      const res = await this.api.chat({
        message,
        onToken: token => {
          streamed += token
          reply.textContent = streamed
          log.scrollTop = log.scrollHeight
        },
        // tool 줄은 답변 말풍선 위에 끼워 넣어 실행 순서대로 보이게 한다
        onToolCall: ({ name, ok }) => {
          const note = this._note(log, `🔧 ${AgentPanel.toolLabel(name)} ${ok ? '✓' : '✗'}`)
          log.insertBefore(note, reply)
        },
      })
      if (res.ok) {
        reply.textContent = res.reply  // 단계 상한 안내처럼 스트리밍되지 않은 답도 있음
        this._note(log, AgentPanel.metaText(res))
      } else {
        reply.textContent = AgentPanel.failText(res)
        reply.style.color = '#e94560'
      }
    } catch (err) {
      reply.textContent = AgentPanel.failText({ reason: 'error', error: err.message })
      reply.style.color = '#e94560'
    } finally {
      this.busy = false
      this._setEnabled(input, button, this.status.enabled)
      input.focus()
    }
  }

  render() {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex; flex-direction:column; gap:10px; height:calc(100vh - 120px)'

    const header = document.createElement('div')
    header.style.cssText = `font-size:12px; color:${this.status.enabled ? '#7bd88f' : '#aaa'}`
    header.textContent = `🤖 도우미 — ${AgentPanel.statusText(this.status)}`

    const log = document.createElement('div')
    log.style.cssText = 'flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding:8px; background:#0a0a1a; border:1px solid #0f3460; border-radius:6px'
    if (this.status.enabled) this._note(log, '예) "불꽃이 배고파 보이는데 먹을 거 있으면 줘", "어디서 사냥하면 좋을까?"')

    const form = document.createElement('div')
    form.style.cssText = 'display:flex; gap:6px'
    const input = document.createElement('input')
    input.type        = 'text'
    input.maxLength   = 500
    input.placeholder = this.status.enabled ? '펫에 대해 물어보거나 부탁해 보세요' : '도우미가 꺼져 있어요'
    input.style.cssText = 'flex:1; padding:8px; background:#16213e; color:#eee; border:1px solid #0f3460; border-radius:4px; font-size:13px'
    const button = document.createElement('button')
    button.textContent  = '보내기'
    button.style.cssText = 'padding:8px 14px; background:#e94560; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px'
    this._setEnabled(input, button, this.status.enabled)

    button.onclick  = () => this._send(log, input, button)
    input.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) this._send(log, input, button) }

    form.appendChild(input)
    form.appendChild(button)
    el.appendChild(header)
    el.appendChild(log)
    el.appendChild(form)
    return el
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = AgentPanel
