const TOWN_MENU = [
  { id: 'pets',      icon: '🐉', label: '내 에레멘탈' },
  { id: 'hunting',   icon: '⚔️',  label: '사냥터' },
  { id: 'story',     icon: '📖', label: '스토리' },
  { id: 'breeding',  icon: '🧬', label: '교배' },
  { id: 'gacha',     icon: '🎰', label: '가챠' },
  { id: 'online',    icon: '🌐', label: '온라인' },
  { id: 'faction',   icon: '⚖️',  label: '세력' },
  { id: 'quest',     icon: '📋', label: '퀘스트' },
]

const ATTR_EMOJI = {
  fire:'🔥', water:'💧', wind:'🌪️', earth:'🌍', thunder:'⚡',
  ice:'❄️', poison:'☠️', dragon:'🐉', light:'✨', dark:'🌑', omni:'🌟',
}

class TownScreen {
  constructor(summoner, hasFreeGacha) {
    this.summoner     = summoner
    this.hasFreeGacha = hasFreeGacha
  }

  render(callbacks) {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex; flex-direction:column; height:100%; background:#0a0a1a;'
    this._renderContent(el, callbacks, null)
    return el
  }

  _renderContent(el, callbacks, gachaResult) {
    const npcDialog = gachaResult
      ? `"와! 정말 특별한 에레멘탈이군요! 소환에 성공했습니다. 앞으로의 여정에 행운을 빕니다!"`
      : this.hasFreeGacha
        ? `"어서오세요, 소환사! 저는 미르린입니다. 처음 오신 분께 에레멘탈 하나를 선물로 드리죠. 어떤 에레멘탈이 나올지는 운명에 맡겨보세요!"`
        : `"어서오세요! 에레멘탈과 함께 강해지세요. 언제든 필요한 게 있으면 찾아오세요."`

    const npcAction = gachaResult
      ? `<div style="background:#0f1a2e;border:1px solid #4a90e2;border-radius:8px;padding:14px;margin-top:10px">
           <div style="font-size:11px;color:#888;margin-bottom:4px">${gachaResult.isHybrid ? '✨ 히든 에레멘탈 소환!' : '✨ 에레멘탈 소환!'}</div>
           <div style="font-size:20px;font-weight:bold;color:#eee">
             ${ATTR_EMOJI[gachaResult.pet.attribute] || '❓'} ${gachaResult.pet.name}
           </div>
           <div style="font-size:12px;color:#aaa;margin-top:4px">
             속성: ${gachaResult.pet.attribute}${gachaResult.pet.attribute2 ? ' / ' + gachaResult.pet.attribute2 : ''}
           </div>
           <button id="btn-gacha-done" style="margin-top:10px;padding:6px 18px;
             background:#0f3460;border:1px solid #4a90e2;color:#eee;border-radius:4px;
             cursor:pointer;font-size:12px">확인</button>
         </div>`
      : this.hasFreeGacha
        ? `<button id="btn-free-gacha" style="margin-top:10px;padding:10px 22px;
             background:linear-gradient(135deg,#e94560,#9b59b6);border:none;color:#fff;
             border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;
             box-shadow:0 0 16px #e9456040">
             ✨ 무료 에레멘탈 소환 (1회)
           </button>`
        : `<span style="font-size:11px;color:#444;margin-top:8px;display:block">무료 소환 완료</span>`

    el.innerHTML = `
      <!-- 헤더 -->
      <div style="background:#16213e;border-bottom:1px solid #0f3460;padding:10px 16px;
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <span style="color:#e94560;font-weight:bold;font-size:14px">⚡ ${this.summoner.name}</span>
          <span style="color:#444;font-size:12px;margin-left:8px">소환사</span>
        </div>
        <button id="btn-enter-game" style="padding:5px 14px;background:#0f3460;
          border:1px solid #4a90e2;color:#4a90e2;border-radius:4px;cursor:pointer;font-size:11px">
          게임 메뉴 →
        </button>
      </div>

      <!-- 마을 -->
      <div style="flex:1;overflow-y:auto;padding:16px;max-width:480px;margin:0 auto;width:100%;box-sizing:border-box">
        <h2 style="color:#ffd54f;font-size:18px;margin-bottom:16px;text-align:center">🏘️ 에레멘탈 마을</h2>

        <!-- NPC -->
        <div style="background:#16213e;border:1px solid #0f3460;border-radius:10px;padding:16px;margin-bottom:20px">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="font-size:36px;flex-shrink:0">🧙</div>
            <div style="flex:1">
              <div style="color:#ffd54f;font-weight:bold;font-size:13px;margin-bottom:4px">미르린 (NPC)</div>
              <p style="color:#ddd;font-size:12px;line-height:1.65">${npcDialog}</p>
              ${npcAction}
            </div>
          </div>
        </div>

        <!-- 메뉴 -->
        <div style="font-size:11px;color:#444;text-align:center;margin-bottom:10px;letter-spacing:2px">── 메뉴 ──</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${TOWN_MENU.map(m => `
            <button data-menu="${m.id}" style="
              padding:14px 8px;background:#16213e;border:1px solid #0f3460;
              border-radius:8px;cursor:pointer;color:#eee;font-size:13px;
              display:flex;align-items:center;gap:8px;transition:border-color 0.15s;
            " onmouseover="this.style.borderColor='#4a90e2'"
              onmouseout="this.style.borderColor='#0f3460'">
              <span style="font-size:22px">${m.icon}</span>${m.label}
            </button>`).join('')}
        </div>
      </div>
    `

    // 이벤트
    el.querySelector('#btn-enter-game')?.addEventListener('click', () => callbacks.onEnterGame())

    if (!gachaResult && this.hasFreeGacha) {
      el.querySelector('#btn-free-gacha')?.addEventListener('click', async () => {
        el.querySelector('#btn-free-gacha').disabled = true
        el.querySelector('#btn-free-gacha').textContent = '소환 중...'
        const res = await window.arcana.summoner.freeGacha()
        if (res.ok) {
          this.hasFreeGacha = false
          callbacks.onFreeGacha(res.pet)
          this._renderContent(el, callbacks, res)
        } else {
          alert(res.error)
        }
      })
    }

    if (gachaResult) {
      el.querySelector('#btn-gacha-done')?.addEventListener('click', () =>
        this._renderContent(el, callbacks, null)
      )
    }

    el.querySelectorAll('[data-menu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.menu
        if (tab === 'hunting') window.arcana.hunting.open()
        else callbacks.onOpenTab(tab)
      })
    })
  }
}
