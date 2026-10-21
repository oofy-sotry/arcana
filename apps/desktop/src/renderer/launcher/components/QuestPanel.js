const TYPE_LABEL = { main: '메인', daily: '일일', special: '특수' }
const STATUS_COLOR = {
  claimed:   '#555',
  completed: '#f5c518',
  active:    '#4a90e2',
  locked:    '#666',
}

class QuestPanel {
  constructor(quests, factionRep, allPets) {
    this.quests     = quests
    this.factionRep = factionRep   // { luxis: N, noctis: N }
    this.allPets    = allPets.filter(p => p.is_alive === 1)
    this._filter    = 'all'
  }

  render(onClaim) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px'
    this._fill(el, onClaim)
    return el
  }

  _fill(el, onClaim) {
    const { luxis, noctis } = this.factionRep

    let html = `
      <h3 style="margin-bottom:8px; color:#e94560">퀘스트</h3>

      <div style="margin-bottom:12px; background:#1a1a2e; border-radius:6px; padding:10px">
        <div style="font-size:12px; color:#aaa; margin-bottom:6px">파벌 평판</div>
        <div style="display:flex; gap:16px; align-items:center">
          <div style="flex:1">
            <div style="font-size:11px; color:#f5c518; margin-bottom:2px">룩시스 ${luxis}/100</div>
            <div style="background:#333; border-radius:3px; height:6px">
              <div style="background:#f5c518; width:${luxis}%; height:6px; border-radius:3px"></div>
            </div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px; color:#9b59b6; margin-bottom:2px">녹티스 ${noctis}/100</div>
            <div style="background:#333; border-radius:3px; height:6px">
              <div style="background:#9b59b6; width:${noctis}%; height:6px; border-radius:3px"></div>
            </div>
          </div>
        </div>
      </div>

      <div id="q-filter-bar" style="display:flex; gap:6px; margin-bottom:10px">
        ${['all','main','daily','special'].map(f =>
          `<button data-f="${f}" style="
            padding:3px 10px; border-radius:4px; border:none; cursor:pointer; font-size:12px;
            background:${this._filter === f ? '#4a90e2' : '#333'};
            color:${this._filter === f ? '#fff' : '#aaa'}
          ">${f === 'all' ? '전체' : TYPE_LABEL[f]}</button>`
        ).join('')}
      </div>

      <div id="q-list" style="display:flex; flex-direction:column; gap:8px">
    `

    const visible = this._filter === 'all'
      ? this.quests
      : this.quests.filter(q => q.type === this._filter)

    visible.forEach(q => {
      const color    = STATUS_COLOR[q.status] ?? '#666'
      const opacity  = q.status === 'locked' ? '0.5' : '1'
      const pct      = Math.min(100, Math.round((q.progress / q.condition.target) * 100))
      const claimed  = q.status === 'claimed'
      const canClaim = q.status === 'completed'

      html += `
        <div style="
          background:#1a1a2e; border-radius:6px; padding:10px;
          border-left:3px solid ${color}; opacity:${opacity}
        ">
          <div style="display:flex; justify-content:space-between; align-items:flex-start">
            <div>
              <span style="font-size:10px; color:#aaa; margin-right:6px">[${TYPE_LABEL[q.type] ?? q.type}]</span>
              <span style="font-size:13px; font-weight:bold; color:#eee">${q.title}</span>
            </div>
            <span style="font-size:10px; color:${color}">${this._statusLabel(q.status)}</span>
          </div>
          <div style="font-size:11px; color:#aaa; margin:4px 0 8px">${q.desc}</div>

          <div style="margin-bottom:8px">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa; margin-bottom:2px">
              <span>진행도</span>
              <span>${q.progress} / ${q.condition.target}</span>
            </div>
            <div style="background:#333; border-radius:3px; height:5px">
              <div style="background:${color}; width:${pct}%; height:5px; border-radius:3px"></div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center">
            <div style="font-size:11px; color:#f5c518">
              보상: 코인 +${q.reward.coins} · EXP +${q.reward.exp}
              ${q.reward.faction ? `· ${q.reward.faction} +${q.reward.faction_rep}` : ''}
            </div>
            ${canClaim ? (this.allPets.length === 0
              ? `<span style="font-size:11px; color:#e94560">수령할 생존 펫이 없습니다</span>`
              : `<div style="display:flex; gap:6px; align-items:center">
                  <select id="q-pet-sel-${q.id}" style="padding:3px; border-radius:4px; background:#333; color:#eee; border:none; font-size:11px">
                    ${this.allPets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                  </select>
                  <button data-claim="${q.id}" style="
                    padding:3px 10px; border-radius:4px; border:none; cursor:pointer;
                    background:#f5c518; color:#000; font-size:11px; font-weight:bold
                  ">수령</button>
                </div>`)
            : claimed ? `<span style="font-size:11px; color:#555">수령 완료</span>` : ''}
          </div>
        </div>
      `
    })

    html += `</div>`
    el.innerHTML = html

    // filter buttons
    el.querySelector('#q-filter-bar').addEventListener('click', e => {
      const btn = e.target.closest('[data-f]')
      if (!btn) return
      this._filter = btn.dataset.f
      this._fill(el, onClaim)
    })

    // claim buttons
    el.querySelectorAll('[data-claim]').forEach(btn => {
      btn.addEventListener('click', () => {
        const questId = btn.dataset.claim
        const sel     = el.querySelector(`#q-pet-sel-${questId}`)
        const petId   = sel?.value ? Number(sel.value) : null
        if (petId != null && !isNaN(petId)) onClaim(questId, petId)
      })
    })
  }

  _statusLabel(status) {
    return { claimed: '수령 완료', completed: '완료!', active: '진행 중', locked: '잠김' }[status] ?? status
  }
}
