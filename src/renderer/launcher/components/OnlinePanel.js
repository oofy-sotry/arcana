const ATTR_EMOJI = { fire:'🔥', water:'💧', wind:'🌪️', earth:'🌍', thunder:'⚡', ice:'❄️', poison:'☠️', dragon:'🐉', light:'✨', dark:'🌑' }
const STAGE_NAMES = ['유년기', '성장기', '완전체', '궁극체', '전설체']
const CAT_LABELS  = { level: '최고 레벨', stage: '최고 진화단계', collection: '보유 마릿수' }

class OnlinePanel {
  constructor(status, serverOnline, allPets) {
    this.status       = status        // { loggedIn, username }
    this.serverOnline = serverOnline
    this.allPets      = allPets.filter(p => p.is_alive === 1)
    this._section     = 'ranking'
  }

  render(callbacks) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px'
    this._fill(el, callbacks)
    return el
  }

  _fill(el, cb) {
    const { loggedIn, username } = this.status

    let html = `<h3 style="margin-bottom:8px; color:#e94560">온라인</h3>`

    if (!this.serverOnline) {
      html += `<div style="background:#2a1a1e; border:1px solid #e94560; border-radius:6px; padding:12px; color:#e94560; font-size:13px; margin-bottom:12px">
        서버에 연결할 수 없습니다. <code>node server/index.js</code>를 실행하거나 네트워크를 확인하세요.
      </div>`
      el.innerHTML = html
      return
    }

    // 로그인/로그아웃 헤더
    if (!loggedIn) {
      html += this._authForm()
    } else {
      html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:8px; background:#1a2a2e; border-radius:6px">
        <span style="color:#4a90e2; font-size:13px">✓ ${username} 로그인됨</span>
        <div style="display:flex; gap:8px">
          <button id="btn-sync" style="padding:3px 10px; border-radius:4px; border:none; cursor:pointer; background:#333; color:#eee; font-size:11px">펫 동기화</button>
          <button id="btn-logout" style="padding:3px 10px; border-radius:4px; border:none; cursor:pointer; background:#555; color:#eee; font-size:11px">로그아웃</button>
        </div>
      </div>`

      // 섹션 탭
      html += `<div id="ol-section-bar" style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap">
        ${['ranking','breeding','battle','pvp','friends'].map(s =>
          `<button data-section="${s}" style="padding:3px 10px; border-radius:4px; border:none; cursor:pointer; font-size:11px;
            background:${this._section === s ? '#4a90e2' : '#333'};
            color:${this._section === s ? '#fff' : '#aaa'}
          ">${{ranking:'랭킹', breeding:'온라인 교배', battle:'배틀', pvp:'PvP 시즌', friends:'친구'}[s]}</button>`
        ).join('')}
      </div>
      <div id="ol-body"></div>`
    }

    el.innerHTML = html

    if (!loggedIn) {
      this._bindAuthForm(el, cb)
    } else {
      el.querySelector('#btn-logout')?.addEventListener('click', () => cb.logout())
      el.querySelector('#btn-sync')?.addEventListener('click', async () => {
        const res = await window.arcana.online.syncPets()
        alert(res.ok ? `${res.synced}마리 동기화 완료!` : `실패: ${res.error}`)
      })
      el.querySelector('#ol-section-bar').addEventListener('click', e => {
        const btn = e.target.closest('[data-section]')
        if (!btn) return
        this._section = btn.dataset.section
        this._fill(el, cb)
      })
      this._renderSection(el.querySelector('#ol-body'), cb)
    }
  }

  _authForm() {
    return `<div id="ol-auth" style="max-width:320px">
      <div id="ol-auth-tabs" style="display:flex; gap:6px; margin-bottom:12px">
        <button data-tab="login" style="padding:4px 14px; border-radius:4px; border:none; cursor:pointer; background:#4a90e2; color:#fff; font-size:12px">로그인</button>
        <button data-tab="register" style="padding:4px 14px; border-radius:4px; border:none; cursor:pointer; background:#333; color:#aaa; font-size:12px">회원가입</button>
      </div>
      <div id="ol-auth-body"></div>
    </div>`
  }

  _bindAuthForm(el, cb) {
    let mode = 'login'
    const render = () => {
      const body = el.querySelector('#ol-auth-body')
      if (mode === 'login') {
        body.innerHTML = `
          <input id="au-email" placeholder="이메일" style="width:100%; padding:7px; margin-bottom:8px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px; font-size:12px" />
          <input id="au-pw" type="password" placeholder="비밀번호" style="width:100%; padding:7px; margin-bottom:10px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px; font-size:12px" />
          <button id="au-submit" style="width:100%; padding:8px; background:#4a90e2; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:13px">로그인</button>
          <div id="au-msg" style="margin-top:8px; font-size:11px; color:#e94560"></div>`
        body.querySelector('#au-submit').addEventListener('click', async () => {
          const email = body.querySelector('#au-email').value.trim()
          const pw    = body.querySelector('#au-pw').value
          const res   = await window.arcana.online.login({ email, password: pw })
          if (res.ok) { cb.refresh() } else { body.querySelector('#au-msg').textContent = `오류: ${res.error}` }
        })
      } else {
        body.innerHTML = `
          <input id="au-name" placeholder="닉네임 (3~20자)" style="width:100%; padding:7px; margin-bottom:8px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px; font-size:12px" />
          <input id="au-email" placeholder="이메일" style="width:100%; padding:7px; margin-bottom:8px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px; font-size:12px" />
          <input id="au-pw" type="password" placeholder="비밀번호 (6자 이상)" style="width:100%; padding:7px; margin-bottom:10px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px; font-size:12px" />
          <button id="au-submit" style="width:100%; padding:8px; background:#e94560; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:13px">회원가입</button>
          <div id="au-msg" style="margin-top:8px; font-size:11px; color:#e94560"></div>`
        body.querySelector('#au-submit').addEventListener('click', async () => {
          const username = body.querySelector('#au-name').value.trim()
          const email    = body.querySelector('#au-email').value.trim()
          const pw       = body.querySelector('#au-pw').value
          const res      = await window.arcana.online.register({ username, email, password: pw })
          if (res.ok) { cb.refresh() } else { body.querySelector('#au-msg').textContent = `오류: ${res.error}` }
        })
      }
    }
    el.querySelector('#ol-auth-tabs').addEventListener('click', e => {
      const btn = e.target.closest('[data-tab]')
      if (!btn) return
      mode = btn.dataset.tab
      el.querySelectorAll('#ol-auth-tabs button').forEach(b => {
        b.style.background = b.dataset.tab === mode ? '#4a90e2' : '#333'
        b.style.color      = b.dataset.tab === mode ? '#fff' : '#aaa'
      })
      render()
    })
    render()
  }

  _renderSection(body, cb) {
    const s = this._section
    if (s === 'ranking')  this._renderRanking(body)
    if (s === 'breeding') this._renderBreeding(body, cb)
    if (s === 'battle')   this._renderBattle(body, cb)
    if (s === 'pvp')      this._renderPvp(body)
    if (s === 'friends')  this._renderFriends(body, cb)
  }

  _renderPvp(body) {
    body.innerHTML = '<span style="color:#aaa; font-size:12px">로딩 중...</span>'
    window.arcana.pvp.ranking().then(({ season, ranking }) => {
      const seasonLabel = season
        ? `시즌 ${season.season_num}${season.is_active ? ' (진행 중)' : ' (종료)'}`
        : '시즌 없음'

      const rankRows = ranking.length
        ? ranking.map((r, i) => `
            <div style="display:flex; justify-content:space-between; padding:6px 8px;
              background:${i % 2 ? '#1a1a2e' : '#16213e'}; border-radius:4px; margin-bottom:3px; font-size:12px">
              <span style="color:${i < 3 ? '#f5c518' : '#eee'}">${i + 1}. ${r.username}</span>
              <span style="color:#aaa">${r.wins}승 ${r.losses}패 (${r.winRate}%)</span>
            </div>`).join('')
        : '<span style="color:#aaa; font-size:12px">데이터 없음</span>'

      body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
          <span style="color:#f5c518; font-size:13px; font-weight:bold">🏆 ${seasonLabel}</span>
        </div>
        <div style="font-size:12px; color:#aaa; margin-bottom:6px">랭킹 TOP 50</div>
        <div>${rankRows}</div>`
    }).catch(() => {
      body.innerHTML = '<span style="color:#e94560; font-size:12px">데이터 로딩 실패</span>'
    })
  }

  _renderRanking(body) {
    body.innerHTML = `<div id="rank-cat-bar" style="display:flex; gap:6px; margin-bottom:10px">
      ${['level','stage','collection'].map(c =>
        `<button data-cat="${c}" style="padding:3px 10px; border-radius:4px; border:none; cursor:pointer; font-size:11px; background:#333; color:#aaa">${CAT_LABELS[c]}</button>`
      ).join('')}
    </div>
    <div id="rank-list"><span style="color:#aaa; font-size:12px">카테고리를 선택하세요</span></div>`

    body.querySelector('#rank-cat-bar').addEventListener('click', async e => {
      const btn = e.target.closest('[data-cat]')
      if (!btn) return
      body.querySelectorAll('[data-cat]').forEach(b => { b.style.background = '#333'; b.style.color = '#aaa' })
      btn.style.background = '#4a90e2'; btn.style.color = '#fff'
      body.querySelector('#rank-list').innerHTML = '<span style="color:#aaa; font-size:12px">로딩 중...</span>'
      const res = await window.arcana.online.ranking({ category: btn.dataset.cat })
      if (res.error) { body.querySelector('#rank-list').innerHTML = `<span style="color:#e94560">오류: ${res.error}</span>`; return }
      const rows = res.ranking.map((u, i) => `
        <div style="display:flex; justify-content:space-between; padding:6px 8px; background:${i % 2 ? '#1a1a2e' : '#16213e'}; border-radius:4px; margin-bottom:3px; font-size:12px">
          <span style="color:${i < 3 ? '#f5c518' : '#eee'}">${i + 1}. ${u.username}</span>
          <span style="color:#aaa">Lv.${u.max_level} · ${STAGE_NAMES[u.max_stage] || '유년기'} · ${u.total_pets}마리</span>
        </div>`).join('')
      body.querySelector('#rank-list').innerHTML = rows || '<span style="color:#aaa; font-size:12px">데이터 없음</span>'
    })
  }

  _renderBreeding(body, cb) {
    body.innerHTML = `
      <div style="margin-bottom:10px">
        <div style="font-size:12px; color:#aaa; margin-bottom:6px">내 교배 공고 등록</div>
        <select id="br-pet" style="padding:5px; border-radius:4px; background:#333; color:#eee; border:none; font-size:12px; width:60%; margin-right:6px">
          ${this.allPets.map(p => `<option value="${p.id}">${p.name} (${p.attribute})</option>`).join('')}
        </select>
        <input id="br-price" type="number" value="100" min="1" style="width:70px; padding:5px; border-radius:4px; background:#333; color:#eee; border:none; font-size:12px; margin-right:6px" />
        <button id="btn-post" style="padding:5px 10px; border-radius:4px; border:none; cursor:pointer; background:#e94560; color:#fff; font-size:12px">등록</button>
        <button id="btn-cancel-offer" style="padding:5px 10px; border-radius:4px; border:none; cursor:pointer; background:#555; color:#eee; font-size:12px; margin-left:4px">취소</button>
      </div>
      <div style="font-size:12px; color:#aaa; margin-bottom:6px">공개 교배 공고</div>
      <div id="br-offers"><span style="color:#aaa; font-size:12px">로딩 중...</span></div>`

    body.querySelector('#btn-post').addEventListener('click', async () => {
      const petId = Number(body.querySelector('#br-pet').value)
      const price = Number(body.querySelector('#br-price').value)
      const pet   = this.allPets.find(p => p.id === petId)
      if (!pet) return
      const snap = { name: pet.name, attribute: pet.attribute, evolution_stage: pet.evolution_stage, level: pet.level, hp: pet.hp, attack: pet.attack, defense: pet.defense }
      const res = await window.arcana.online.breedingPost({ pet: snap, price })
      alert(res.ok ? '공고 등록 완료!' : `실패: ${res.error}`)
      this._renderBreeding(body, cb)
    })
    body.querySelector('#btn-cancel-offer').addEventListener('click', async () => {
      await window.arcana.online.breedingCancel()
      this._renderBreeding(body, cb)
    })

    window.arcana.online.breedingOffers().then(res => {
      if (res.error || !res.offers) { body.querySelector('#br-offers').innerHTML = `<span style="color:#e94560">${res.error || '오류'}</span>`; return }
      if (!res.offers.length) { body.querySelector('#br-offers').innerHTML = '<span style="color:#aaa; font-size:12px">등록된 공고 없음</span>'; return }
      body.querySelector('#br-offers').innerHTML = res.offers.map(o => `
        <div style="background:#1a1a2e; border-radius:6px; padding:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center">
          <div>
            <span style="font-size:12px; color:#eee">${o.pet?.name} ${ATTR_EMOJI[o.pet?.attribute] || ''}</span>
            <span style="font-size:11px; color:#aaa; margin-left:8px">by ${o.username} · ${o.price}코인</span>
          </div>
          <button data-offer-id="${o.id}" style="padding:3px 10px; border-radius:4px; border:none; cursor:pointer; background:#4a90e2; color:#fff; font-size:11px">교배 신청</button>
        </div>`).join('')

      body.querySelector('#br-offers').querySelectorAll('[data-offer-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const petId = Number(body.querySelector('#br-pet').value)
          const myPet = this.allPets.find(p => p.id === petId)
          if (!myPet) { alert('내 펫을 선택하세요'); return }
          const snap = { name: myPet.name, attribute: myPet.attribute, evolution_stage: myPet.evolution_stage, level: myPet.level, hp: myPet.hp, attack: myPet.attack, defense: myPet.defense }
          const res = await window.arcana.online.breedingRequest({ offerId: Number(btn.dataset.offerId), myPet: snap })
          if (res.ok) {
            alert(`교배 성공!\n자식: ${res.child.name} (${res.child.attribute})`)
            cb.refresh()
          } else { alert(`실패: ${res.error}`) }
        })
      })
    }).catch(() => {
      body.querySelector('#br-offers').innerHTML = '<span style="color:#e94560">네트워크 오류</span>'
    })
  }

  _renderBattle(body, cb) {
    body.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-size:12px; color:#aaa; margin-bottom:6px">배틀 도전</div>
        <div style="display:flex; gap:6px; align-items:center">
          <input id="bt-target" placeholder="상대 닉네임" style="flex:1; padding:5px; border-radius:4px; background:#333; color:#eee; border:none; font-size:12px" />
          <select id="bt-pet" style="flex:1; padding:5px; border-radius:4px; background:#333; color:#eee; border:none; font-size:12px">
            ${this.allPets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <button id="btn-challenge" style="padding:5px 12px; border-radius:4px; border:none; cursor:pointer; background:#e94560; color:#fff; font-size:12px">도전!</button>
        </div>
        <div id="bt-result" style="margin-top:8px"></div>
      </div>
      <div style="font-size:12px; color:#aaa; margin-bottom:6px">최근 배틀 기록</div>
      <div id="bt-history"><span style="color:#aaa; font-size:12px">로딩 중...</span></div>`

    body.querySelector('#btn-challenge').addEventListener('click', async () => {
      const targetUsername = body.querySelector('#bt-target').value.trim()
      const petId          = Number(body.querySelector('#bt-pet').value)
      const pet            = this.allPets.find(p => p.id === petId)
      if (!targetUsername || !pet) return
      const snap = { name: pet.name, attribute: pet.attribute, level: pet.level, hp: pet.hp || 50, attack: pet.attack || 10, defense: pet.defense || 5 }
      const res  = await window.arcana.online.battleChallenge({ targetUsername, myPet: snap })
      const div  = body.querySelector('#bt-result')
      if (res.ok) {
        const outcome = res.winner === 'attacker' ? 'win' : res.winner === 'draw' ? 'draw' : 'lose'
        const bg      = outcome === 'win' ? '#1a3a1e' : outcome === 'draw' ? '#2a2a1a' : '#3a1a1e'
        const color   = outcome === 'win' ? '#4ae84a' : outcome === 'draw' ? '#f5c518' : '#e84a4a'
        const label   = outcome === 'win' ? '승리!'   : outcome === 'draw' ? '무승부'  : '패배...'
        div.innerHTML = `<div style="padding:8px; border-radius:6px; background:${bg}; font-size:12px; color:${color}">
          ${label} vs ${res.defUsername} (${res.defPet?.name})
        </div>`
        this._loadBattleHistory(body)
      } else { div.innerHTML = `<span style="color:#e94560; font-size:12px">오류: ${res.error}</span>` }
    })

    this._loadBattleHistory(body)
  }

  _loadBattleHistory(body) {
    window.arcana.online.battleHistory().then(res => {
      if (!res.history) { body.querySelector('#bt-history').innerHTML = '<span style="color:#aaa; font-size:12px">기록 없음</span>'; return }
      body.querySelector('#bt-history').innerHTML = res.history.map(r => `
        <div style="background:#1a1a2e; border-radius:4px; padding:6px 8px; margin-bottom:4px; display:flex; justify-content:space-between; font-size:11px">
          <span style="color:#aaa">${r.attacker_username} vs ${r.defender_username}</span>
          <span style="color:${r.won ? '#4ae84a' : '#e84a4a'}">${r.won ? '승' : '패'}</span>
        </div>`).join('') || '<span style="color:#aaa; font-size:12px">기록 없음</span>'
    }).catch(() => {
      body.querySelector('#bt-history').innerHTML = '<span style="color:#e94560">네트워크 오류</span>'
    })
  }

  _renderFriends(body, cb) {
    body.innerHTML = `
      <div style="display:flex; gap:6px; margin-bottom:10px">
        <input id="fr-name" placeholder="닉네임으로 친구 추가" style="flex:1; padding:5px; border-radius:4px; background:#333; color:#eee; border:none; font-size:12px" />
        <button id="btn-add-friend" style="padding:5px 12px; border-radius:4px; border:none; cursor:pointer; background:#4a90e2; color:#fff; font-size:12px">추가</button>
      </div>
      <div id="fr-list"><span style="color:#aaa; font-size:12px">로딩 중...</span></div>`

    body.querySelector('#btn-add-friend').addEventListener('click', async () => {
      const username = body.querySelector('#fr-name').value.trim()
      if (!username) return
      const res = await window.arcana.online.friendsAdd({ username })
      if (res.ok) { body.querySelector('#fr-name').value = ''; this._loadFriends(body, cb) }
      else alert(`실패: ${res.error}`)
    })

    this._loadFriends(body, cb)
  }

  _loadFriends(body, cb) {
    window.arcana.online.friends().then(res => {
      if (!res.friends) { body.querySelector('#fr-list').innerHTML = '<span style="color:#aaa; font-size:12px">친구 없음</span>'; return }
      body.querySelector('#fr-list').innerHTML = res.friends.map(f => `
        <div style="background:#1a1a2e; border-radius:6px; padding:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center">
          <div>
            <span style="font-size:13px; color:#eee">${f.username}</span>
            <span style="font-size:11px; color:#aaa; margin-left:8px">펫 ${f.pet_count}마리</span>
          </div>
          <button data-friend-id="${f.id}" class="btn-remove-friend" style="padding:3px 8px; border-radius:4px; border:none; cursor:pointer; background:#555; color:#eee; font-size:11px">삭제</button>
        </div>`).join('') || '<span style="color:#aaa; font-size:12px">친구 없음</span>'

      body.querySelector('#fr-list').querySelectorAll('.btn-remove-friend').forEach(btn => {
        btn.addEventListener('click', async () => {
          await window.arcana.online.friendsRemove({ friendId: Number(btn.dataset.friendId) })
          this._loadFriends(body, cb)
        })
      })
    }).catch(() => {
      body.querySelector('#fr-list').innerHTML = '<span style="color:#e94560">네트워크 오류</span>'
    })
  }
}
