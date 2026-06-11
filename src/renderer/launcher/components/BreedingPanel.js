const ATTR_EMOJI_B = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉', omni: '🌟' }
const COMPAT_LABEL = { S: '💖 같은 속성', C: '❤️ 호환', N: '💛 중립', I: '💔 불호환' }

class BreedingPanel {
  constructor(allPets) {
    this.allPets = allPets.filter(p => p.is_alive === 1)
  }

  render(onBreedDone) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px'

    const petOptions = this.allPets.map(p => {
      const remaining = (p.max_breeding ?? 3) - (p.used_breeding ?? 0)
      return `<option value="${p.id}">${ATTR_EMOJI_B[p.attribute] || ''} ${p.name} (남은교배: ${remaining})</option>`
    }).join('')

    el.innerHTML = `
      <h3 style="margin-bottom:12px; color:#e94560">교배</h3>
      <div style="display:flex; gap:10px; margin-bottom:12px">
        <select id="breed-pet1" style="flex:1; padding:8px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px">
          <option value="">— 부모 1 선택 —</option>${petOptions}
        </select>
        <select id="breed-pet2" style="flex:1; padding:8px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px">
          <option value="">— 부모 2 선택 —</option>${petOptions}
        </select>
      </div>
      <div id="breed-compat" style="background:#16213e; border-radius:6px; padding:10px; margin-bottom:12px; min-height:52px; color:#666; font-size:13px">
        두 펫을 선택하면 궁합이 표시됩니다
      </div>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px">
        <label style="color:#aaa; font-size:13px">몰빵 횟수:</label>
        <input id="breed-batch" type="number" min="1" value="1"
          style="width:70px; padding:6px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px; text-align:center">
      </div>
      <button id="breed-btn" disabled
        style="padding:10px 28px; background:#e94560; border:none; color:#fff; border-radius:6px; cursor:pointer; font-size:14px; opacity:0.4">
        교배 실행
      </button>
      <div id="breed-result" style="margin-top:16px"></div>
    `

    const sel1       = el.querySelector('#breed-pet1')
    const sel2       = el.querySelector('#breed-pet2')
    const compatBox  = el.querySelector('#breed-compat')
    const batchInput = el.querySelector('#breed-batch')
    const btn        = el.querySelector('#breed-btn')
    const resultBox  = el.querySelector('#breed-result')

    const updateCompat = async () => {
      const id1 = parseInt(sel1.value)
      const id2 = parseInt(sel2.value)
      if (!id1 || !id2 || id1 === id2) {
        compatBox.textContent = '두 펫을 선택하면 궁합이 표시됩니다'
        btn.disabled = true
        btn.style.opacity = '0.4'
        return
      }
      const info  = await window.arcana.breeding.compatInfo({ petId1: id1, petId2: id2 })
      if (info.error) {
        compatBox.textContent = `오류: ${info.error}`
        btn.disabled = true
        btn.style.opacity = '0.4'
        return
      }
      let compatHtml = ''
      if (info.compat === 'T2') {
        const t2 = info.t2Result
        compatHtml = `
          <div style="font-size:14px;color:#ce93d8;margin-bottom:6px">🧬 T2 혼합종 교배 가능!</div>
          <div style="font-size:12px;color:#aaa">
            결과: <span style="color:#f5a623">${t2?.name ?? '불명'} (${t2?.species ?? ''})</span>
            &nbsp;·&nbsp; 확률 3% &nbsp;·&nbsp; 최대 몰빵: ${info.maxBatch}회
          </div>`
      } else if (info.compat === 'Omni') {
        compatHtml = `
          <div style="font-size:14px;color:#ffb300;margin-bottom:6px">🌟 옴니렉스 교배 가능!</div>
          <div style="font-size:12px;color:#aaa">
            결과: <span style="color:#ffb300">옴니렉스 (Omnirex)</span>
            &nbsp;·&nbsp; 확률 3% &nbsp;·&nbsp; 최대 몰빵: ${info.maxBatch}회
          </div>`
      } else {
        const label  = COMPAT_LABEL[info.compat] ?? info.compat
        const hybrid = info.hybridResult
          ? `<span style="color:#f5a623">혼합속성 가능: ${info.hybridResult.name ?? info.hybridResult.attribute}</span>`
          : '<span style="color:#666">혼합속성 없음</span>'
        compatHtml = `
          <div style="font-size:14px;margin-bottom:6px">${label}</div>
          <div style="font-size:12px;color:#aaa">최대 몰빵: ${info.maxBatch}회 &nbsp;|&nbsp; ${hybrid}</div>`
      }
      compatBox.innerHTML = compatHtml
      batchInput.max   = info.maxBatch
      batchInput.value = Math.min(parseInt(batchInput.value) || 1, info.maxBatch)
      btn.disabled     = false
      btn.style.opacity = '1'
    }

    sel1.addEventListener('change', updateCompat)
    sel2.addEventListener('change', updateCompat)

    btn.addEventListener('click', async () => {
      const id1   = parseInt(sel1.value)
      const id2   = parseInt(sel2.value)
      const batch = parseInt(batchInput.value) || 1
      resultBox.innerHTML = '<span style="color:#aaa">교배 중...</span>'
      const res = await window.arcana.breeding.breed({ petId1: id1, petId2: id2, batchCount: batch })
      if (!res.ok) {
        resultBox.innerHTML = `<div style="color:#e94560">${res.error ?? '교배 실패'}</div>`
        return
      }
      const child = res.child
      let tagHtml = ''
      let borderColor = '#0f3460'
      let headerText  = '✨ 새 에레멘탈 탄생!'
      if (res.isOmnirex) {
        tagHtml     = `<span style="color:#ffb300;font-size:11px"> [🌟 옴니렉스 탄생!]</span>`
        borderColor = '#ffb300'
        headerText  = '🌟 옴니렉스 각성!'
      } else if (res.isT2) {
        tagHtml     = `<span style="color:#ce93d8;font-size:11px"> [🧬 T2: ${res.t2Name ?? ''}]</span>`
        borderColor = '#ce93d8'
        headerText  = '🧬 T2 혼합종 탄생!'
      } else if (res.isHybrid) {
        tagHtml = `<span style="color:#f5a623;font-size:11px"> [혼합: ${res.hybridName}]</span>`
      }
      const attrDisplay = (child.attribute2 ? `${child.attribute} / ${child.attribute2}` : child.attribute)
      resultBox.innerHTML = `
        <div style="background:#0f3460;border:1px solid ${borderColor};border-radius:8px;padding:12px">
          <div style="color:#aaa;font-size:12px;margin-bottom:6px">${headerText}</div>
          <div style="font-size:16px;font-weight:bold">
            ${ATTR_EMOJI_B[child.attribute] || ''} ${child.name}${tagHtml}
          </div>
          <div style="font-size:12px;color:#aaa;margin-top:4px">
            속성: ${attrDisplay} &nbsp;·&nbsp; 몰빵 ${res.batchCount}회 소모
          </div>
        </div>
      `
      if (onBreedDone) onBreedDone()
    })

    return el
  }
}
