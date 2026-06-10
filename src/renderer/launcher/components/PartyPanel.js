const ATTR_EMOJI_P  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉' }
const STAGE_NAMES_P = ['유년기', '성장기', '완전체', '궁극체', '전설체']

class PartyPanel {
  constructor(allPets, party) {
    this.allPets = allPets.filter(p => p.is_alive === 1)
    this.party   = party  // { members: [...], synergy: [...] }
  }

  render(onPartyChange) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px'
    this._fill(el, onPartyChange)
    return el
  }

  _fill(el, onPartyChange) {
    const { members, synergy } = this.party
    const memberIds = new Set(members.map(m => m.id))

    const slots = [0, 1, 2].map(slot => ({
      slot,
      member: members.find(m => m.slot === slot) ?? null,
    }))

    let html = `<h3 style="margin-bottom:12px; color:#e94560">파티 구성</h3>`

    slots.forEach(({ slot, member }) => {
      if (member) {
        html += `
          <div style="background:#16213e; border:1px solid #0f3460; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; align-items:center; gap:12px">
            <div style="font-size:24px">${ATTR_EMOJI_P[member.attribute] || '❓'}</div>
            <div style="flex:1">
              <div style="font-weight:bold">${member.name}</div>
              <div style="font-size:11px; color:#aaa">슬롯 ${slot + 1} · ${STAGE_NAMES_P[member.evolution_stage ?? 0]}</div>
            </div>
            <button data-remove="${member.id}" style="padding:4px 10px; background:#333; border:none; color:#aaa; border-radius:4px; cursor:pointer; font-size:12px">제거</button>
          </div>`
      } else {
        const available = this.allPets
          .filter(p => !memberIds.has(p.id))
          .map(p => `<option value="${p.id}">${ATTR_EMOJI_P[p.attribute] || ''} ${p.name}</option>`)
          .join('')
        html += `
          <div style="background:#16213e; border:1px dashed #0f3460; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; align-items:center; gap:10px">
            <div style="color:#555; font-size:13px; flex:1">슬롯 ${slot + 1} — 비어있음</div>
            <select data-slot="${slot}" style="padding:6px; background:#0f3460; border:1px solid #1a4a7a; color:#eee; border-radius:4px; font-size:12px; max-width:160px">
              <option value="">+ 펫 추가</option>${available}
            </select>
          </div>`
      }
    })

    if (synergy.length > 0) {
      html += `<div style="margin-top:12px"><div style="color:#aaa; font-size:12px; margin-bottom:6px">시너지 효과</div>`
      synergy.forEach(s => {
        html += `<div style="background:#0f3460; border-radius:4px; padding:8px; margin-bottom:6px; font-size:12px; color:#4ecdc4">${s.desc}</div>`
      })
      html += `</div>`
    } else {
      html += `<div style="margin-top:12px; color:#555; font-size:12px">시너지 없음 — 같은 속성 2~3마리 편성 시 발동</div>`
    }

    if (members.length > 0) {
      html += `<button id="party-clear" style="margin-top:12px; padding:6px 14px; background:#333; border:none; color:#aaa; border-radius:4px; cursor:pointer; font-size:12px">파티 해산</button>`
    }

    el.innerHTML = html

    el.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const res = await window.arcana.party.remove({ petId: parseInt(btn.dataset.remove) })
        if (res && res.error) return
        if (onPartyChange) onPartyChange(res)
      })
    })

    el.querySelectorAll('[data-slot]').forEach(sel => {
      sel.addEventListener('change', async () => {
        const petId = parseInt(sel.value)
        const slot  = parseInt(sel.dataset.slot)
        if (!petId) return
        const res = await window.arcana.party.add({ petId, slot })
        if (res && res.error) { sel.value = ''; return }
        if (onPartyChange) onPartyChange(res)
      })
    })

    const clearBtn = el.querySelector('#party-clear')
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const res = await window.arcana.party.clear()
        if (onPartyChange) onPartyChange(res)
      })
    }
  }
}
