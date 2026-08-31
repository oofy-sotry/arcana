const STAGE_NAMES = ['유년기', '성장기', '완전체', '궁극체', '전설체']
const ATTR_EMOJI  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉', omni: '🌟' }

// index.html 기준 상대경로 — src/renderer/launcher/ → 프로젝트 루트까지 3단계
const SPRITE_BASE = '../../../assets/sprites/characters/'

class PetCard {
  constructor(pet, onSelect) {
    this.pet      = pet
    this.onSelect = onSelect
  }

  // 캐릭터 아트가 있으면 이미지, 없으면(아직 그려지지 않은 종·단계) 이모지로 폴백
  _createIcon(isDead) {
    const emoji = ATTR_EMOJI[this.pet.attribute] || '❓'
    const wrap  = document.createElement('div')
    wrap.style.cssText = 'width:40px; height:40px; flex-shrink:0; display:flex; align-items:center; justify-content:center;'

    const spriteId = (this.pet.species && this.pet.species !== 'default') ? this.pet.species.toLowerCase() : this.pet.attribute
    const img = document.createElement('img')
    img.src   = `${SPRITE_BASE}${spriteId}_${this.pet.evolution_stage}.png`
    img.style.cssText = `width:40px; height:40px; object-fit:contain;${isDead ? ' filter:grayscale(1);' : ''}`
    img.onerror = () => {
      wrap.innerHTML = ''
      const span = document.createElement('span')
      span.style.cssText = `font-size:32px;${isDead ? ' filter:grayscale(1);' : ''}`
      span.textContent = emoji
      wrap.appendChild(span)
    }
    wrap.appendChild(img)
    return wrap
  }

  render() {
    const { pet } = this
    const cond    = pet.conditions || {}
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

    const info = document.createElement('div')
    info.style.flex = '1'
    info.innerHTML = isDead ? `
        <div style="font-size:16px; font-weight:bold">
          ${pet.name}
          <span style="font-size:10px; background:#8b0000; color:#fff; padding:2px 6px; border-radius:3px; margin-left:6px; vertical-align:middle">사망</span>
        </div>
        <div style="font-size:12px; color:#888">Lv.${pet.level || 1} · ${stage}</div>
        <div style="font-size:11px; color:#555; margin-top:4px">부활석으로 되살릴 수 있습니다</div>` : `
        <div style="font-size:16px; font-weight:bold">${pet.name}</div>
        <div style="font-size:12px; color:#aaa">Lv.${pet.level || 1} · ${stage}</div>
        <div style="margin-top:6px; display:flex; gap:8px; font-size:11px; color:#888">
          <span>배고픔 ${Math.round(cond.hunger ?? 100)}</span>
          <span>행복 ${Math.round(cond.happiness ?? 100)}</span>
          <span>청결 ${Math.round(cond.cleanliness ?? 100)}</span>
        </div>`

    el.appendChild(this._createIcon(isDead))
    el.appendChild(info)
    if (!isDead) el.addEventListener('click', () => this.onSelect(pet.id))

    return el
  }
}
