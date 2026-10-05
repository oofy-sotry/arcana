// 골드버전식 턴제 전투 화면 — 위: 상대, 아래: 내 펫, 맨 아래: 메시지 + 싸우다/가방/교체/도망/자동
const PET_IMG_BASE_BT = '../../../assets/sprites/characters/'
const MSG_DELAY_BT    = 650  // 메시지 한 줄 표시 시간
const AUTO_DELAY_BT   = 380  // 자동 모드일 때

class BattleScreen {
  constructor(root) {
    this.root = root
    this.auto = false
    this.state = null
    this.shown = null // 연출 중 표시 HP { mon, pet }
  }

  // 전투 하나를 끝까지 진행 — { outcome } 또는 { error }로 끝남
  run({ zoneId, monsterId }) {
    return new Promise(async resolve => {
      this._resolve = resolve
      const res = await window.arcana.battle.start({ zoneId, monsterId })
      if (res?.error) { resolve({ error: res.error }); return }
      this._build()
      this.root.classList.add('show')
      this._apply(res.state)
      await this._play(res.events)
      this._menu()
    })
  }

  _build() {
    this.root.innerHTML = `
      <div class="bt-field">
        <div class="bt-box bt-enemy-box">
          <div class="bt-name" id="bt-mon-name"></div>
          <div class="bt-hp-wrap"><div class="bt-hp" id="bt-mon-hp"></div></div>
        </div>
        <div class="bt-sprite bt-enemy-sprite" id="bt-mon-sprite"></div>
        <div class="bt-sprite bt-pet-sprite" id="bt-pet-sprite"></div>
        <div class="bt-box bt-pet-box">
          <div class="bt-name" id="bt-pet-name"></div>
          <div class="bt-hp-wrap"><div class="bt-hp" id="bt-pet-hp"></div></div>
          <div class="bt-nums" id="bt-pet-nums"></div>
        </div>
      </div>
      <div class="bt-bottom">
        <div class="bt-message" id="bt-message"></div>
        <div class="bt-menu" id="bt-menu"></div>
      </div>`
    this.$ = id => this.root.querySelector(`#${id}`)
  }

  // ─── 상태 반영 ─────────────────────────────────────────────────────
  _apply(state) {
    const prevMon = this.state?.monster.id
    const prevPet = this.state?.party[this.state.active]?.id
    this.state = state
    const m   = state.monster
    const pet = state.party[state.active]
    this.shown = { mon: m.hp, pet: pet.hp }
    this.$('bt-mon-name').textContent = `${m.isBoss ? '👑 ' : ''}${m.name}  T${m.tier}`
    this.$('bt-pet-name').textContent = `${pet.name}  Lv.${pet.level}`
    if (prevMon !== m.id) this._sprite('bt-mon-sprite', { seed: m.id, attribute: m.attribute, kind: 'monster', isBoss: m.isBoss })
    if (prevPet !== pet.id) this._petSprite(pet)
    this._bars()
  }

  _bars() {
    const m   = this.state.monster
    const pet = this.state.party[this.state.active]
    this._bar('bt-mon-hp', this.shown.mon, m.maxHp)
    this._bar('bt-pet-hp', this.shown.pet, pet.maxHp)
    this.$('bt-pet-nums').textContent = `HP ${Math.max(0, Math.round(this.shown.pet))}/${pet.maxHp}  ·  MP ${pet.mp}/${pet.maxMp}`
  }

  _bar(id, hp, max) {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100))
    const el  = this.$(id)
    el.style.width      = `${pct}%`
    el.style.background = pct > 50 ? '#2ecc71' : pct > 20 ? '#f39c12' : '#e74c3c'
  }

  _sprite(id, opts) {
    const box = this.$(id)
    box.innerHTML = ''
    const canvas = PixelSprite.toCanvas(opts)
    canvas.className = 'bt-px'
    box.appendChild(canvas)
  }

  // 펫은 그려진 이미지가 있으면 이미지, 없으면 도트 (hunting.js spawnPetSprite와 같은 규칙)
  _petSprite(pet) {
    const box = this.$('bt-pet-sprite')
    box.innerHTML = ''
    const spriteId = pet.species === 'OmnirexHidden' ? 'omnirex'
      : (pet.species && pet.species !== 'default') ? pet.species.toLowerCase() : pet.attribute
    const img = new Image()
    img.className = 'bt-px'
    img.onerror = () => this._sprite('bt-pet-sprite', { seed: `${pet.species}_${pet.attribute}_${pet.stage}`, attribute: pet.attribute, kind: 'pet' })
    img.src = `${PET_IMG_BASE_BT}${spriteId}_${pet.stage}${pet.species === 'OmnirexHidden' ? '_hidden' : ''}.png`
    box.appendChild(img)
  }

  _say(text) {
    this.$('bt-message').textContent = text
    return new Promise(r => setTimeout(r, this.auto ? AUTO_DELAY_BT : MSG_DELAY_BT))
  }

  _shake(id) {
    const el = this.$(id)
    el.classList.remove('bt-hit')
    void el.offsetWidth
    el.classList.add('bt-hit')
  }

  // ─── 이벤트 재생 ───────────────────────────────────────────────────
  async _play(events) {
    const pet = () => this.state.party[this.state.active]
    for (const e of events) {
      switch (e.type) {
        case 'appear':  await this._say(`야생의 ${e.name}이(가) 나타났다!`); break
        case 'switch':  await this._say(`가랏, ${e.name}!`); break
        case 'attack':
          if (e.dodged) { await this._say(`${pet().name}은(는) 공격을 피했다!`); break }
          await this._say(e.actor === 'pet' ? `${e.name}의 ${e.move}!` : `${e.name}의 공격!`)
          if (e.actor === 'pet') { this.shown.mon -= e.damage; this._shake('bt-mon-sprite') }
          else                   { this.shown.pet -= e.damage; this._shake('bt-pet-sprite') }
          this._bars()
          if (e.isCrit) await this._say('급소에 맞았다!')
          if (e.attrMult > 1) await this._say('효과가 굉장했다!')
          if (e.attrMult < 1) await this._say('효과가 별로인 듯하다…')
          break
        case 'counter': this.shown.mon -= e.damage; this._bars(); await this._say(`${e.name}의 반격!`); break
        case 'dot':     this.shown.mon -= e.damage; this._bars(); await this._say(`${e.name}은(는) 지속 피해를 입었다!`); break
        case 'stunned': await this._say(`${e.name}은(는) 움직일 수 없다!`); break
        case 'buff':    await this._say(`${e.name}의 ${e.move}!`); break
        case 'item':    await this._say(`${e.item}을(를) 사용했다!`); break
        case 'run':     await this._say(e.ok ? '무사히 도망쳤다!' : '도망칠 수 없었다!'); break
        case 'capture': await this._say('포획 구슬을 던졌다!'); await this._say(e.ok ? `좋았어! ${e.name}을(를) 잡았다!` : '아깝다! 빠져나왔다!'); break
        case 'ko':      await this._say(`${e.name}은(는) 쓰러졌다!`); break
      }
    }
  }

  // ─── 행동 ──────────────────────────────────────────────────────────
  async _act(action) {
    this.$('bt-menu').innerHTML = ''
    const res = await window.arcana.battle.act(action)
    if (res?.error) { await this._say(`⚠ ${res.error}`); this._menu(); return }
    await this._play(res.events)
    this._apply(res.state)
    if (res.outcome) { await this._end(res.outcome); return }
    this._menu()
  }

  async _end(outcome) {
    if (outcome.result === 'won') {
      await this._say(`${outcome.winner}은(는) ${outcome.exp} 경험치와 ${outcome.coins} 코인을 얻었다!`)
      if (outcome.drops?.length) await this._say(`${outcome.drops.map(d => d.itemId).join(', ')}을(를) 주웠다!`)
    }
    if (outcome.result === 'captured') await this._say(`${outcome.captured.name}이(가) 동료가 되었다!`)
    if (outcome.result === 'lost') {
      await this._say('눈앞이 캄캄해졌다…')
      for (const w of outcome.wipe) {
        if (w.escaped)          await this._say(`${w.name}은(는) 무사히 도망쳤다!`)
        else if (w.faint?.died) await this._say(`💀 ${w.name}은(는) 다시 일어나지 못했다…`)
        else if (w.faint?.revived)  await this._say(`✨ 부활석의 힘으로 ${w.name}이(가) 버텨냈다!`)
        else if (w.faint?.shielded) await this._say(`🛡 생명의 부적이 ${w.name}을(를) 지켜줬다!`)
        else                    await this._say(`😵 ${w.name}은(는) 기절했다… (기절 ${w.faint?.faintCount}/3)`)
      }
      await this._say('가까운 회복소로 서둘러 돌아갔다…')
    }
    this.root.classList.remove('show')
    this._resolve({ outcome })
  }

  // ─── 메뉴 ──────────────────────────────────────────────────────────
  _menu() {
    const st = this.state
    if (st.needSwitch) {
      if (this.auto) { this._act({ type: 'switch', index: st.party.findIndex(p => !p.ko) }); return }
      this._say('다음 에레멘탈을 고르세요')
      this._partyMenu(true)
      return
    }
    if (this.auto) { this._act({ type: 'auto' }); this._autoButton(); return }
    this.$('bt-message').textContent = `${st.party[st.active].name}은(는) 무엇을 할까?`
    this._buttons([
      ['싸우다', () => this._moveMenu()],
      ['가방',   () => this._bagMenu()],
      ['교체',   () => this._partyMenu(false)],
      ['도망',   () => this._act({ type: 'run' })],
      ['자동 ▶', () => { this.auto = true; this._menu() }],
    ])
  }

  _moveMenu() {
    this._buttons([
      ...this.state.moves.map(mv => [
        `${mv.name}${mv.mpCost ? ` (MP ${mv.mpCost})` : ''}`,
        () => this._act({ type: 'skill', moveId: mv.id }),
        !mv.usable,
      ]),
      ['◀ 뒤로', () => this._menu()],
    ])
  }

  _bagMenu() {
    const bag = this.state.bag
    if (!bag.length) { this.$('bt-message').textContent = '가방에 전투용 아이템이 없다.' }
    this._buttons([
      ...bag.map(it => [`${it.name} ×${it.quantity}`, () => this._act({ type: 'item', itemId: it.itemId })]),
      ['◀ 뒤로', () => this._menu()],
    ])
  }

  _partyMenu(forced) {
    const st = this.state
    this._buttons([
      ...st.party.map((p, i) => [
        `${p.name} ${p.ko ? '(쓰러짐)' : `HP ${p.hp}/${p.maxHp}`}`,
        () => this._act({ type: 'switch', index: i }),
        p.ko || i === st.active,
      ]),
      ...(forced ? [] : [['◀ 뒤로', () => this._menu()]]),
    ])
  }

  // 자동 진행 중에는 "자동 중지" 버튼만 — 누르면 이번 턴이 끝난 뒤 메뉴로 돌아옴
  _autoButton() {
    this._buttons([['⏸ 자동 중지', () => { this.auto = false; this.$('bt-menu').innerHTML = '' }]])
  }

  _buttons(list) {
    const menu = this.$('bt-menu')
    menu.innerHTML = ''
    for (const [label, onClick, disabled] of list) {
      const b = document.createElement('button')
      b.textContent = label
      b.disabled    = !!disabled
      b.onclick     = onClick
      menu.appendChild(b)
    }
  }
}
