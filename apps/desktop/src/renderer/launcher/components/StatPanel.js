class StatPanel {
  constructor(pet, onEvolve) {
    this.pet     = pet
    this.onEvolve = onEvolve || null
  }

  render() {
    const { pet } = this
    const el = document.createElement('div')
    el.style.cssText = 'background:#16213e; border-radius:8px; padding:16px;'

    const stats = [
      { label: 'HP',   value: pet.hp      || 100 },
      { label: 'MP',   value: pet.mp      || 100 },
      { label: '공격', value: pet.attack  || 10  },
      { label: '방어', value: pet.defense || 5   },
      { label: '속도', value: pet.speed   || 10  },
    ]

    const spriteId = pet.species === 'OmnirexHidden' ? 'omnirex'
      : (pet.species && pet.species !== 'default') ? pet.species.toLowerCase() : pet.attribute
    const spriteSuffix = pet.species === 'OmnirexHidden' ? '_hidden' : ''
    el.innerHTML = `
      <img src="../../../assets/sprites/characters/${spriteId}_${pet.evolution_stage}${spriteSuffix}.png"
           id="stat-sprite" style="width:96px; height:96px; object-fit:contain; display:block; margin:0 auto 12px;" />
      <h3 style="margin-bottom:12px; color:#e94560">${pet.name} 스탯</h3>
      <div style="font-size:12px; color:#aaa; margin-bottom:10px">Lv.${pet.level || 1} · 경험치 ${pet.exp || 0}</div>
      ${stats.map(s => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #0f3460;">
          <span style="color:#aaa">${s.label}</span>
          <span style="font-weight:bold">${s.value}</span>
        </div>`).join('')}
      <div style="margin-top:10px; font-size:12px; color:#888">스킬 포인트: ${pet.skill_points || 0}</div>
      <div style="font-size:12px; color:#888">친화도: ${Math.round(pet.affinity || 50)}</div>
      <button id="btn-evolve" style="margin-top:14px; width:100%; padding:8px; background:#0f3460; border:1px solid #e94560; color:#e94560; border-radius:6px; cursor:pointer; font-size:13px">
        진화 시도
      </button>`

    // 런처 CSP(script-src 'self')가 인라인 onerror를 막아 깨진 이미지가 보였음 — JS로 붙여 도트로 교체
    const img = el.querySelector('#stat-sprite')
    img.onerror = () => {
      const dot = PixelSprite.element({
        seed: `${pet.species}_${pet.attribute}_${pet.evolution_stage}`, attribute: pet.attribute, kind: 'pet',
      }, 96)
      dot.style.display = 'block'
      dot.style.margin  = '0 auto 12px'
      img.replaceWith(dot)
    }

    el.querySelector('#btn-evolve').addEventListener('click', () => this.onEvolve?.())
    return el
  }
}
