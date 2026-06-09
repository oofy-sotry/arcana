class StatPanel {
  constructor(pet) {
    this.pet = pet
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

    el.innerHTML = `
      <h3 style="margin-bottom:12px; color:#e94560">${pet.name} 스탯</h3>
      <div style="font-size:12px; color:#aaa; margin-bottom:10px">Lv.${pet.level || 1} · 경험치 ${pet.exp || 0}</div>
      ${stats.map(s => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #0f3460;">
          <span style="color:#aaa">${s.label}</span>
          <span style="font-weight:bold">${s.value}</span>
        </div>`).join('')}
      <div style="margin-top:10px; font-size:12px; color:#888">스킬 포인트: ${pet.skill_points || 0}</div>
      <div style="font-size:12px; color:#888">친화도: ${Math.round(pet.affinity || 50)}</div>`

    return el
  }
}
