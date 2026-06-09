class SkillTree {
  constructor(pet, skills) {
    this.pet    = pet
    this.skills = skills
  }

  render(onUpgrade) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px;'
    el.innerHTML = `<h3 style="margin-bottom:12px; color:#e94560">스킬 (포인트: ${this.pet.skill_points || 0})</h3>`

    if (this.skills.length === 0) {
      el.innerHTML += `<p style="color:#aaa">해금된 스킬이 없습니다.</p>`
      return el
    }

    this.skills.forEach(s => {
      const data    = s.data || {}
      const canUp   = (this.pet.skill_points || 0) > 0 && s.skill_level < 5
      const row     = document.createElement('div')
      row.style.cssText = 'background:#16213e; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;'
      row.innerHTML = `
        <div>
          <div style="font-weight:bold">${data.name || s.skill_id}</div>
          <div style="font-size:11px; color:#aaa">Lv.${s.skill_level}/5 · 계수 ${(1.0 + (s.skill_level - 1) * 0.1).toFixed(1)}</div>
        </div>
        <button data-skill="${s.skill_id}" style="padding:4px 12px; background:${canUp ? '#e94560' : '#555'}; border:none; color:#fff; border-radius:4px; cursor:${canUp ? 'pointer' : 'default'}; font-size:12px" ${canUp ? '' : 'disabled'}>
          강화
        </button>`
      row.querySelector('button').addEventListener('click', () => {
        if (canUp) onUpgrade(s.skill_id)
      })
      el.appendChild(row)
    })

    return el
  }
}
