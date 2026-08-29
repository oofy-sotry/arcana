// 실시간 PvP WS 클라이언트 — 브라우저 표준 WebSocket을 감싼 얇은 레이어.
// 프로토콜(메시지 파싱/디스패치)과 DOM 렌더링을 분리해서 순수 로직만 테스트 가능하게 함.
class RealtimeSocket {
  constructor() {
    this._ws        = null
    this._listeners = new Map() // type -> Set<handler>
  }

  on(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set())
    this._listeners.get(type).add(handler)
    return () => this._listeners.get(type)?.delete(handler)
  }

  _emit(type, payload) {
    this._listeners.get(type)?.forEach(fn => fn(payload))
  }

  // 서버가 보낸 원문 하나를 파싱해서 타입별로 디스패치 (테스트에서 WebSocket 없이 직접 호출 가능)
  handleMessage(raw) {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (!msg || typeof msg.type !== 'string') return
    this._emit(msg.type, msg)
    this._emit('*', msg)
  }

  connect({ wsUrl, token }) {
    if (!token) { this._emit('auth:error', { error: 'no_token' }); return }
    this._ws = new WebSocket(wsUrl)
    this._ws.addEventListener('open', () => this._send({ type: 'auth', token }))
    this._ws.addEventListener('message', event => this.handleMessage(event.data))
    this._ws.addEventListener('close', () => this._emit('disconnected', {}))
    this._ws.addEventListener('error', err => this._emit('socket:error', err))
  }

  _send(msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) this._ws.send(JSON.stringify(msg))
  }

  joinQueue(pet)  { this._send({ type: 'queue:join', pet }) }
  leaveQueue()    { this._send({ type: 'queue:leave' }) }

  close() {
    this._ws?.close()
    this._ws = null
  }
}

// 렌더러는 번들러 없는 plain <script> 태그라 module이 없음 — 전역 클래스 선언으로 남겨둠.
// Node(node:test)에서 require할 때만 CommonJS export 사용.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeSocket
}
