const STAGE_NAMES = ['유년기', '성장기', '완전체', '궁극체', '전설체']
const ATTR_EMOJI  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉' }

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

    const el = document.createElement('div')
    el.style.cssText = 'background:#16213e; border:1px solid #0f3460; border-radius:8px; padding:14px; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:14px;'

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
    return el
  }
}
