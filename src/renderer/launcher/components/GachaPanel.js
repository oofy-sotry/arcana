const ATTR_EMOJI_G  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉' }
const STAGE_NAMES_G = ['유년기', '성장기', '완전체', '궁극체', '전설체']
const STAGE_COLOR_G = ['#888', '#4ecdc4', '#45b7d1', '#f5a623', '#e94560']

// index.html 기준 상대경로 — src/renderer/launcher/ → 프로젝트 루트까지 3단계
const SPRITE_BASE_G = '../../../assets/sprites/characters/'

class GachaPanel {
  constructor(allPets) {
    this.allPets = allPets.filter(p => p.is_alive === 1)
  }

  render(onRollDone) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px'

    const petOptions = this.allPets.map(p =>
      `<option value="${p.id}">${p.name} (코인: ${p.coins ?? 0})</option>`
    ).join('')

    el.innerHTML = `
      <h3 style="margin-bottom:12px; color:#e94560">가챠 소환</h3>
      <div style="margin-bottom:12px">
        <label style="color:#aaa; font-size:13px">코인 지불 펫:</label>
        <select id="gacha-owner" style="width:100%; margin-top:6px; padding:8px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px">
          <option value="">— 펫 선택 —</option>${petOptions}
        </select>
      </div>
      <div style="display:flex; gap:10px; margin-bottom:16px">
        <button id="gacha-single" style="flex:1; padding:12px; background:#0f3460; border:1px solid #1a4a7a; color:#eee; border-radius:6px; cursor:pointer; font-size:13px; line-height:1.6">
          단일 소환<br><span style="color:#f5a623; font-size:11px">100 코인</span>
        </button>
        <button id="gacha-ten" style="flex:1; padding:12px; background:#0f3460; border:1px solid #1a4a7a; color:#eee; border-radius:6px; cursor:pointer; font-size:13px; line-height:1.6">
          10연 소환<br><span style="color:#f5a623; font-size:11px">900 코인 (완전체+ 1마리 보장)</span>
        </button>
      </div>
      <div id="gacha-result"></div>
    `

    const ownerSel  = el.querySelector('#gacha-owner')
    const singleBtn = el.querySelector('#gacha-single')
    const tenBtn    = el.querySelector('#gacha-ten')
    const resultBox = el.querySelector('#gacha-result')

    const doRoll = async (type) => {
      const ownerPetId = parseInt(ownerSel.value)
      if (!ownerPetId) {
        resultBox.innerHTML = '<div style="color:#e94560">펫을 선택하세요</div>'
        return
      }
      resultBox.innerHTML = '<span style="color:#aaa">소환 중...</span>'
      const res = type === 'single'
        ? await window.arcana.gacha.rollSingle({ ownerPetId })
        : await window.arcana.gacha.rollTen({ ownerPetId })

      if (res.error) {
        resultBox.innerHTML = `<div style="color:#e94560">${res.error}</div>`
        return
      }

      resultBox.innerHTML = `<div style="color:#aaa; font-size:12px; margin-bottom:8px">소환 결과 (${res.costCoins} 코인 소모)</div>`
      res.pets.forEach(pet => {
        const stage = pet.evolution_stage ?? 0
        const color = STAGE_COLOR_G[stage] || '#888'
        const card  = document.createElement('div')
        card.style.cssText = `background:#16213e; border:1px solid ${color}; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; align-items:center; gap:12px`

        const iconWrap = document.createElement('div')
        iconWrap.style.cssText = 'width:40px; height:40px; flex-shrink:0; display:flex; align-items:center; justify-content:center;'
        const spriteId = (pet.species && pet.species !== 'default') ? pet.species.toLowerCase() : pet.attribute
        const img = document.createElement('img')
        img.src   = `${SPRITE_BASE_G}${spriteId}_${stage}.png`
        img.style.cssText = 'width:40px; height:40px; object-fit:contain;'
        img.onerror = () => {
          iconWrap.innerHTML = ''
          const span = document.createElement('span')
          span.style.cssText = 'font-size:28px'
          span.textContent = ATTR_EMOJI_G[pet.attribute] || '❓'
          iconWrap.appendChild(span)
        }
        iconWrap.appendChild(img)

        const info = document.createElement('div')
        info.innerHTML = `
          <div style="font-weight:bold">${pet.name}</div>
          <div style="font-size:11px; color:${color}">${STAGE_NAMES_G[stage]} · ${pet.attribute}</div>
        `

        card.appendChild(iconWrap)
        card.appendChild(info)
        resultBox.appendChild(card)
      })

      if (onRollDone) onRollDone()
    }

    singleBtn.addEventListener('click', () => doRoll('single'))
    tenBtn.addEventListener('click',    () => doRoll('ten'))

    return el
  }
}
