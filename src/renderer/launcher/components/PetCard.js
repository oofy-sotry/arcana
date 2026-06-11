const STAGE_NAMES = ['유년기', '성장기', '완전체', '궁극체', '전설체']
const ATTR_EMOJI  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉', omni: '🌟' }

class PetCard {
  constructor(pet, onSelect) {
    this.pet      = pet
    this.onSelect = onSelect
  }

  render() {
    const { pet } = this
    const cond    = pet.conditions || {}
    const emoji   = ATTR_EMOJI[pet.attribute] || '❓'
    const stage   = STAGE_NAMES[pet.evolution_stage] || '알 수 없음'
    const isDead  = Number(pet.is_alive) === 0

    const el = document.createElement('div')
    el.style.cssText = `
      background:${isDead ? '#1a1a1a' : '#16213e'};
      border:1px solid ${isDead ? '#333' : '#0f3460'};
      border-radius:8px; padding:14px; margin-bottom:10px;
      display:flex; align-items:center; gap:14px;
      opacity:${isDead ? '0.6' : '1'};
      cursor:${isDead ? 'default' : 'pointer'};
    `

    if (isDead) {
      el.innerHTML = `
        <div style="font-size:32px; filter:grayscale(1)">${emoji}</div>
        <div style="flex:1">
          <div style="font-size:16px; font-weight:bold">
            ${pet.name}
            <span style="font-size:10px; background:#8b0000; color:#fff; padding:2px 6px; border-radius:3px; margin-left:6px; vertical-align:middle">사망</span>
          </div>
          <div style="font-size:12px; color:#888">Lv.${pet.level || 1} · ${stage}</div>
          <div style="font-size:11px; color:#555; margin-top:4px">부활석으로 되살릴 수 있습니다</div>
        </div>`
    } else {
      el.innerHTML = `
        <div style="font-size:32px">${emoji}</div>
        <div style="flex:1">
          <div style="font-size:16px; font-weight:bold">${pet.name}</div>
          <div style="font-size:12px; color:#aaa">Lv.${pet.level || 1} · ${stage}</div>
          <div style="margin-top:6px; display:flex; gap:8px; font-size:11px; color:#888">
            <span>배고픔 ${Math.round(cond.hunger ?? 100)}</span>
            <span>행복 ${Math.round(cond.happiness ?? 100)}</span>
            <span>청결 ${Math.round(cond.cleanliness ?? 100)}</span>
          </div>
        </div>`
      el.addEventListener('click', () => this.onSelect(pet.id))
    }

    return el
  }
}
