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
        ${['ranking','breeding','battle','pvp','party-hunt','friends'].map(s =>
          `<button data-section="${s}" style="padding:3px 10px; border-radius:4px; border:none; cursor:pointer; font-size:11px;
            background:${this._section === s ? '#4a90e2' : '#333'};
            color:${this._section === s ? '#fff' : '#aaa'}
          ">${{ranking:'랭킹', breeding:'온라인 교배', battle:'배틀', pvp:'PvP 시즌', 'party-hunt':'파티 사냥', friends:'친구'}[s]}</button>`
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
    if (s === 'pvp')        this._renderPvp(body)
    if (s === 'party-hunt') this._renderPartyHunt(body)
    if (s === 'friends')    this._renderFriends(body, cb)
  }

  _renderPvp(body) {
    body.innerHTML = `
      <div style="background:#0d1117; border:1px solid #4a90e2; border-radius:8px; padding:12px; margin-bottom:14px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <span style="color:#4a90e2; font-size:13px; font-weight:bold">⚡ 실시간 대전</span>
          <select id="rt-pet" style="padding:3px 6px; border-radius:4px; background:#333; color:#eee; border:none; font-size:11px">
            ${this.allPets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div id="rt-status">
          <button id="rt-start" style="padding:6px 14px; background:#4a90e2; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:12px">매칭 시작</button>
        </div>
        <div id="rt-log" style="margin-top:8px; max-height:140px; overflow-y:auto; font-size:11px; color:#ccc"></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <span style="color:#f5c518; font-size:13px; font-weight:bold">🏆 실시간 PvP 글로벌 랭킹</span>
      </div>
      <div id="rt-ranking" style="margin-bottom:14px"><span style="color:#aaa; font-size:12px">로딩 중...</span></div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
        <span style="color:#f5c518; font-size:13px; font-weight:bold">시즌 랭킹 (로컬 · 즉시대전+실시간 합산)</span>
      </div>
      <div id="pvp-season"><span style="color:#aaa; font-size:12px">로딩 중...</span></div>
    `

    this._bindRealtimePvp(body)
    this._loadRealtimeRanking(body.querySelector('#rt-ranking'))
    this._loadSeasonRanking(body.querySelector('#pvp-season'))
  }

  _loadRealtimeRanking(el) {
    window.arcana.online.realtimeRanking().then(res => {
      if (!res.ranking) { el.innerHTML = '<span style="color:#e94560; font-size:12px">오류</span>'; return }
      el.innerHTML = res.ranking.length
        ? res.ranking.map((r, i) => `
            <div style="display:flex; justify-content:space-between; padding:6px 8px;
              background:${i % 2 ? '#1a1a2e' : '#16213e'}; border-radius:4px; margin-bottom:3px; font-size:12px">
              <span style="color:${i < 3 ? '#f5c518' : '#eee'}">${i + 1}. ${r.username}</span>
              <span style="color:#aaa">${r.wins}승 ${r.losses}패 (${r.winRate}%)</span>
            </div>`).join('')
        : '<span style="color:#aaa; font-size:12px">데이터 없음</span>'
    }).catch(() => { el.innerHTML = '<span style="color:#e94560; font-size:12px">네트워크 오류</span>' })
  }

  _loadSeasonRanking(el) {
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
      el.innerHTML = `
        <div style="font-size:12px; color:#aaa; margin-bottom:6px">${seasonLabel} · TOP 50</div>
        <div>${rankRows}</div>`
    }).catch(() => {
      el.innerHTML = '<span style="color:#e94560; font-size:12px">데이터 로딩 실패</span>'
    })
  }

  // 실시간 매칭/대전 상태 머신: idle → waiting → battling → result → idle
  _bindRealtimePvp(body) {
    const statusEl  = body.querySelector('#rt-status')
    const logEl     = body.querySelector('#rt-log')
    const petSelect = body.querySelector('#rt-pet')

    const socket  = new RealtimeSocket()
    let authed    = false
    let mySide    = null
    let oppUsername = ''

    const appendLog = html => {
      const line = document.createElement('div')
      line.innerHTML = html
      logEl.appendChild(line)
      logEl.scrollTop = logEl.scrollHeight
    }

    const setIdle = () => {
      statusEl.innerHTML = `<button id="rt-start" style="padding:6px 14px; background:#4a90e2; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:12px">매칭 시작</button>`
      statusEl.querySelector('#rt-start').addEventListener('click', start)
    }
    const setWaiting = () => {
      statusEl.innerHTML = `<span style="color:#aaa; font-size:12px">상대를 찾는 중...</span>
        <button id="rt-cancel" style="margin-left:8px; padding:3px 8px; background:#555; border:none; color:#eee; border-radius:4px; cursor:pointer; font-size:11px">취소</button>`
      statusEl.querySelector('#rt-cancel').addEventListener('click', () => { socket.leaveQueue(); setIdle() })
    }
    const setBattling = () => {
      statusEl.innerHTML = `<span style="color:#4ae84a; font-size:12px">⚔️ ${oppUsername}와(과) 대전 중...</span>`
    }
    const setResult = (text, color) => {
      statusEl.innerHTML = `<span style="color:${color}; font-size:13px; font-weight:bold">${text}</span>
        <button id="rt-again" style="margin-left:8px; padding:3px 10px; background:#4a90e2; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:11px">다시 매칭</button>`
      statusEl.querySelector('#rt-again').addEventListener('click', start)
    }

    socket.on('auth:ok', () => { authed = true; socket.joinQueue(this._selectedRtPet(petSelect)) })
    socket.on('auth:error', e => { statusEl.innerHTML = `<span style="color:#e94560; font-size:12px">인증 실패: ${e.error}</span>` })
    socket.on('queue:waiting', () => setWaiting())
    socket.on('match:found', m => {
      mySide = m.self
      oppUsername = m.opponent.username
      logEl.innerHTML = ''
      setBattling()
    })
    socket.on('turn', t => {
      const label = t.actor === mySide ? '내 펫' : oppUsername
      appendLog(`<span style="color:${t.isCrit ? '#ffd54f' : '#ccc'}">${label} → ${t.damage} 데미지${t.isCrit ? ' (크리티컬!)' : ''}</span>`)
    })
    socket.on('result', r => {
      const outcome = r.winner === mySide ? 'win' : r.winner === 'draw' ? 'draw' : 'lose'
      const text    = (outcome === 'win' ? '승리!' : outcome === 'draw' ? '무승부' : '패배...') + (r.forfeited ? ' (상대 이탈)' : '')
      const color   = outcome === 'win' ? '#4ae84a' : outcome === 'draw' ? '#f5c518' : '#e84a4a'
      setResult(text, color)
      this._loadRealtimeRanking(body.querySelector('#rt-ranking'))
      // 무승부는 로컬 시즌 랭킹(승/패만 있음)에 반영할 대상이 없어 제외
      if (outcome === 'win' || outcome === 'lose') {
        window.arcana.pvp.recordRealtimeResult({ won: outcome === 'win' })
      }
    })

    const start = async () => {
      if (authed) { socket.joinQueue(this._selectedRtPet(petSelect)); return }
      const { token, wsUrl } = await window.arcana.online.getWsInfo()
      if (!token) { statusEl.innerHTML = '<span style="color:#e94560; font-size:12px">먼저 로그인하세요</span>'; return }
      socket.connect({ wsUrl, token })
    }

    statusEl.querySelector('#rt-start').addEventListener('click', start)
  }

  // rt-pet select에서 고른 펫을 실시간 전투용 스냅샷으로 변환
  _selectedRtPet(petSelect) {
    const pet = this.allPets.find(p => p.id === Number(petSelect.value))
    return {
      name: pet?.name || '이름없음', attribute: pet?.attribute || 'fire', level: pet?.level || 1,
      hp: pet?.hp || 50, attack: pet?.attack || 10, defense: pet?.defense || 5, speed: pet?.speed || 10,
    }
  }

  _renderPartyHunt(body) {
    body.innerHTML = `
      <div style="background:#0d1117; border:1px solid #2ecc71; border-radius:8px; padding:12px; margin-bottom:14px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:6px">
          <span style="color:#2ecc71; font-size:13px; font-weight:bold">🗡️ 파티 사냥</span>
          <select id="ph-zone" style="flex:1; padding:3px 6px; border-radius:4px; background:#333; color:#eee; border:none; font-size:11px"></select>
          <select id="ph-pet" style="padding:3px 6px; border-radius:4px; background:#333; color:#eee; border:none; font-size:11px">
            ${this.allPets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div id="ph-status">
          <button id="ph-start" style="padding:6px 14px; background:#2ecc71; border:none; color:#0a0a1a; border-radius:4px; cursor:pointer; font-size:12px">사냥 시작</button>
        </div>
        <div id="ph-log" style="margin-top:8px; max-height:160px; overflow-y:auto; font-size:11px; color:#ccc"></div>
      </div>
      <p style="font-size:11px; color:#666">같은 구역을 고른 2~3명이 모이면 시작합니다. 세력 평판·스토리로 잠긴 구역은 목록에 없습니다.</p>
    `

    window.arcana.hunting.getZones().then(zones => {
      const sel = body.querySelector('#ph-zone')
      zones.filter(z => !z.unlock).forEach(z => {
        const opt = document.createElement('option')
        opt.value = z.id
        opt.textContent = `${z.name} (Lv.${z.minLevel}-${z.maxLevel})`
        sel.appendChild(opt)
      })
    })

    this._bindPartyHunt(body)
  }

  // 파티 사냥 상태 머신: idle → waiting/forming → hunting → result → idle
  _bindPartyHunt(body) {
    const statusEl  = body.querySelector('#ph-status')
    const logEl     = body.querySelector('#ph-log')
    const petSelect = body.querySelector('#ph-pet')
    const zoneSelect = body.querySelector('#ph-zone')

    const socket = new RealtimeSocket()
    let authed = false
    let myUserId = null
    let selectedPetId = null

    const appendLog = html => {
      const line = document.createElement('div')
      line.innerHTML = html
      logEl.appendChild(line)
      logEl.scrollTop = logEl.scrollHeight
    }

    const setIdle = () => {
      statusEl.innerHTML = `<button id="ph-start" style="padding:6px 14px; background:#2ecc71; border:none; color:#0a0a1a; border-radius:4px; cursor:pointer; font-size:12px">사냥 시작</button>`
      statusEl.querySelector('#ph-start').addEventListener('click', start)
    }
    const setWaiting = count => {
      statusEl.innerHTML = `<span style="color:#aaa; font-size:12px">파티원을 찾는 중... (${count}/3)</span>
        <button id="ph-cancel" style="margin-left:8px; padding:3px 8px; background:#555; border:none; color:#eee; border-radius:4px; cursor:pointer; font-size:11px">취소</button>`
      statusEl.querySelector('#ph-cancel').addEventListener('click', () => { socket.leavePartyHunt(); setIdle() })
    }
    const setHunting = () => {
      statusEl.innerHTML = `<span style="color:#2ecc71; font-size:12px">⚔️ 사냥 중...</span>`
    }
    const setResult = summary => {
      const text = summary.reason === 'cleared' ? `클리어! ${summary.cleared}/${summary.total} 처치` : `전멸... ${summary.cleared}/${summary.total} 처치`
      const color = summary.reason === 'cleared' ? '#4ae84a' : '#e84a4a'
      statusEl.innerHTML = `<span style="color:${color}; font-size:13px; font-weight:bold">${text}</span>
        <button id="ph-again" style="margin-left:8px; padding:3px 10px; background:#2ecc71; border:none; color:#0a0a1a; border-radius:4px; cursor:pointer; font-size:11px">다시 사냥</button>`
      statusEl.querySelector('#ph-again').addEventListener('click', start)
    }

    socket.on('auth:ok', m => {
      authed = true
      myUserId = m.userId
      socket.joinPartyHunt({ zoneId: zoneSelect.value, pet: this._selectedRtPet(petSelect) })
    })
    socket.on('auth:error', e => { statusEl.innerHTML = `<span style="color:#e94560; font-size:12px">인증 실패: ${e.error}</span>` })
    socket.on('party:queue-status', m => { if (m.status !== 'locked') setWaiting(m.count) })
    socket.on('party:formed', m => {
      logEl.innerHTML = ''
      appendLog(`파티 결성: ${m.members.map(x => x.username).join(', ')}`)
      setHunting()
    })
    socket.on('encounter:start', m => appendLog(`<b style="color:#ffd54f">${m.monsterName}${m.isBoss ? ' (보스!)' : ''} 등장!</b>`))
    socket.on('hunt:turn', t => {
      if (t.target === 'monster') {
        const who = t.actor === myUserId ? '내 펫' : t.actor
        appendLog(`${who} → 몬스터 ${t.damage} 데미지${t.isCrit ? ' (크리티컬!)' : ''}`)
      } else {
        const who = t.target === myUserId ? '내 펫' : t.target
        appendLog(`<span style="color:#e84a4a">몬스터 → ${who} ${t.damage} 데미지${t.targetAlive === false ? ' (쓰러짐)' : ''}</span>`)
      }
    })
    socket.on('monster:defeated', m => {
      appendLog(`<span style="color:#4ae84a">✅ 처치!</span>`)
      const myReward = m.rewards[myUserId]
      if (myReward && selectedPetId) {
        window.arcana.hunting.applyRealtimeReward({
          petId: selectedPetId, exp: myReward.exp, coins: myReward.coins, drops: myReward.drops,
        })
        const dropText = myReward.drops.length ? `, 드롭: ${myReward.drops.map(d => d.itemId).join(', ')}` : ''
        appendLog(`&nbsp;&nbsp;보상: exp+${myReward.exp}, 코인+${myReward.coins}${dropText}`)
      }
    })
    socket.on('hunt:end', summary => setResult(summary))

    const start = async () => {
      selectedPetId = Number(petSelect.value)
      if (authed) { socket.joinPartyHunt({ zoneId: zoneSelect.value, pet: this._selectedRtPet(petSelect) }); return }
      const { token, wsUrl } = await window.arcana.online.getWsInfo()
      if (!token) { statusEl.innerHTML = '<span style="color:#e94560; font-size:12px">먼저 로그인하세요</span>'; return }
      socket.connect({ wsUrl, token })
    }

    statusEl.querySelector('#ph-start').addEventListener('click', start)
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
          const res = await window.arcana.online.breedingRequest({ offerId: Number(btn.dataset.offerId), myPet: snap, myPetId: petId })
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
