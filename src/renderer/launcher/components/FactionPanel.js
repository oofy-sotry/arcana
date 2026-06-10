// FactionPanel — Luxis/Noctis 평판 · 영혼동화도 · 히든엔딩 조건
class FactionPanel {
  constructor(repData, soulFusion, hiddenCond, chapter) {
    this.rep        = repData    // { luxis, noctis }
    this.soul       = soulFusion // 0-100 (숫자)
    this.hiddenCond = hiddenCond // checkHiddenEndingConditions() 결과
    this.chapter    = chapter    // 현재 챕터 (0-5)
  }

  render() {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'padding:4px'

    const soulVisible = this.soul >= 40  // 40 미만은 숨김

    wrap.innerHTML = `
      <h3 style="color:#e94560;margin-bottom:16px">⚖ 세력 & 영혼동화도</h3>

      <!-- Luxis -->
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#ffd54f;font-size:14px;font-weight:bold">✦ Luxis</span>
          <span style="color:#ffd54f;font-size:13px">${this.rep.luxis} / 100</span>
        </div>
        ${this._repBar(this.rep.luxis, '#ffd54f')}
        <div style="color:#aaa;font-size:11px;margin-top:3px">${this._tierLabel('luxis', this.rep.luxis)}</div>
      </div>

      <!-- Noctis -->
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#ce93d8;font-size:14px;font-weight:bold">✦ Noctis</span>
          <span style="color:#ce93d8;font-size:13px">${this.rep.noctis} / 100</span>
        </div>
        ${this._repBar(this.rep.noctis, '#ce93d8')}
        <div style="color:#aaa;font-size:11px;margin-top:3px">${this._tierLabel('noctis', this.rep.noctis)}</div>
      </div>

      <!-- 균형 상태 -->
      <div style="background:#16213e;border:1px solid #0f3460;border-radius:6px;padding:10px;margin-bottom:16px;text-align:center">
        ${this._balanceIndicator()}
      </div>

      <!-- 영혼동화도 -->
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#80cbc4;font-size:14px;font-weight:bold">◈ 영혼동화도</span>
          <span style="color:#80cbc4;font-size:13px">${soulVisible ? `${Math.floor(this.soul)} / 100` : '???'}</span>
        </div>
        ${this._soulBar(soulVisible)}
        <div style="color:#aaa;font-size:11px;margin-top:3px">${this._soulLabel(soulVisible)}</div>
      </div>

      <!-- 챕터 진행 -->
      <div style="margin-bottom:16px">
        <h4 style="color:#ccc;margin-bottom:8px;font-size:13px">📖 스토리 진행</h4>
        ${this._chapterProgress()}
      </div>

      <!-- 히든 엔딩 조건 -->
      <div style="background:#0d1117;border:1px solid #1a4a7a;border-radius:6px;padding:12px">
        <h4 style="color:#aaa;margin-bottom:10px;font-size:12px">🔒 히든 엔딩 — 카오스(混) 조건</h4>
        ${this._hiddenConditions()}
      </div>
    `
    return wrap
  }

  _repBar(value, color) {
    const pct = Math.max(0, Math.min(100, value))
    return `
      <div style="background:#0f3460;border-radius:4px;height:10px;overflow:hidden">
        <div style="background:${color};width:${pct}%;height:100%;transition:width 0.3s;border-radius:4px"></div>
      </div>
    `
  }

  _tierLabel(faction, rep) {
    if (rep >= 90) return `최고 등급 — 신성 속성 해금, 전설 장비 접근 가능`
    if (rep >= 70) return `고급 — 고급 구역·희귀 퀘스트 해금`
    if (rep >= 50) return `중급 — 세력 구역 접근, 상점 이용 가능`
    if (rep >= 30) return `기초 — 기본 구역 접근 가능`
    return `비우호적`
  }

  _balanceIndicator() {
    const diff = Math.abs(this.rep.luxis - this.rep.noctis)
    const balanced = diff <= 20
    return balanced
      ? `<span style="color:#66bb6a;font-size:13px">⚖ 균형 유지 중 (차이: ${diff}) — 히든 엔딩 조건 충족</span>`
      : `<span style="color:#ef5350;font-size:13px">⚖ 불균형 (차이: ${diff}) — 히든 엔딩 조건 미충족 (20 이하 필요)</span>`
  }

  _soulBar(visible) {
    if (!visible) {
      return `<div style="background:#0f3460;border-radius:4px;height:10px;position:relative">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#555">???</div>
      </div>`
    }
    const pct = Math.max(0, Math.min(100, this.soul))
    const color = pct >= 100 ? '#e94560' : pct >= 80 ? '#ff7043' : '#80cbc4'
    return `
      <div style="background:#0f3460;border-radius:4px;height:10px;overflow:hidden">
        <div style="background:${color};width:${pct}%;height:100%;transition:width 0.3s;border-radius:4px"></div>
      </div>
    `
  }

  _soulLabel(visible) {
    if (!visible) return '(40 이상부터 공개)'
    const s = this.soul
    if (s >= 100) return '완전 혼합 — 히든 엔딩 조건 달성!'
    if (s >= 80)  return '근원 접촉 — 특수 이펙트 활성화'
    if (s >= 60)  return '혼합 존재 — 게이지 공개됨'
    if (s >= 40)  return '혼합 시작'
    return ''
  }

  _chapterProgress() {
    const chapters = ['1장: 첫 계약', '2장: 속성 지역 탐방', '3장: 혼합 속성 + 대반전', '4장: 거짓된 전면전', '5장: 옴니렉스 (정규 엔딩)']
    return `<div style="display:flex;gap:4px">
      ${chapters.map((name, i) => `
        <div style="flex:1;text-align:center;padding:6px 2px;border-radius:4px;font-size:10px;
          background:${i < this.chapter ? '#1a4a7a' : i === this.chapter ? '#0f3460' : '#0d1117'};
          color:${i < this.chapter ? '#4fc3f7' : i === this.chapter ? '#eee' : '#333'};
          border:1px solid ${i < this.chapter ? '#1a6a9a' : '#0f3460'}">
          ${i < this.chapter ? '✓' : i === this.chapter ? '▶' : '○'}<br>${name.split(':')[0]}
        </div>`).join('')}
    </div>`
  }

  _hiddenConditions() {
    if (!this.hiddenCond) {
      return '<p style="color:#444;font-size:12px">데이터 로딩 중...</p>'
    }
    const c = this.hiddenCond
    const row = (label, met, detail) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="color:${met ? '#66bb6a' : '#ef5350'};font-size:16px">${met ? '✓' : '✗'}</span>
        <div>
          <div style="font-size:12px;color:${met ? '#66bb6a' : '#aaa'}">${label}</div>
          <div style="font-size:11px;color:#555">${detail}</div>
        </div>
      </div>
    `
    return `
      ${row('혼합구원 ≥ 5',
        c.hybridRescue.met,
        `현재 ${c.hybridRescue.value} / 5`)}
      ${row('세력 균형 (차이 ≤ 20)',
        c.reputationBalance.met,
        `Luxis ${c.reputationBalance.luxis} vs Noctis ${c.reputationBalance.noctis} (차이 ${c.reputationBalance.diff})`)}
      ${row('영혼동화도 = 100',
        c.soulFusion.met,
        this.soul >= 40 ? `현재 ${Math.floor(c.soulFusion.value)} / 100` : '???')}
      ${c.allMet
        ? `<div style="text-align:center;margin-top:8px;padding:8px;background:#1a1a2e;border:1px solid #e94560;border-radius:6px;color:#e94560;font-size:13px">
             ✨ 히든 엔딩 조건 달성! 스토리 5장에서 세 번째 선택지가 나타납니다.
           </div>`
        : ''}
    `
  }
}
