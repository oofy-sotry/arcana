// Maps registry — renderer 환경에서 require 대신 inline import
const MAPS = {
  town: null, // 아래에서 동적 로드
}

class WorldScreen {
  constructor(summoner, mapState) {
    this.summoner = summoner
    this.mapState = mapState  // { map_id, tile_x, tile_y }
    this.engine   = null
    this.npcDialog = null
  }

  render(callbacks) {
    this.callbacks = callbacks
    const el = document.createElement('div')
    el.style.cssText = 'display:flex; flex-direction:column; height:100%; background:#0a0a1a; position:relative;'

    // 상단 HUD
    el.innerHTML = `
      <div id="world-hud" style="
        background:rgba(10,10,26,0.9); border-bottom:1px solid #0f3460;
        padding:6px 12px; display:flex; align-items:center; justify-content:space-between;
        flex-shrink:0; z-index:10;
      ">
        <div>
          <span style="color:#e94560; font-weight:bold; font-size:13px">⚡ ${this.summoner.name}</span>
          <span style="color:#555; font-size:11px; margin-left:6px">Lv.${this.summoner.level ?? 1}</span>
        </div>
        <div style="display:flex; gap:8px">
          <button id="btn-menu" style="padding:4px 12px; background:#16213e; border:1px solid #0f3460;
            color:#aaa; border-radius:4px; cursor:pointer; font-size:11px">☰ 메뉴</button>
        </div>
      </div>

      <!-- 캔버스 영역 -->
      <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden">
        <canvas id="world-canvas" style="image-rendering:pixelated; max-width:100%; max-height:100%;"></canvas>
      </div>

      <!-- NPC 대화창 (숨김) -->
      <div id="npc-dialog" style="
        display:none; position:absolute; bottom:60px; left:50%; transform:translateX(-50%);
        width:90%; max-width:480px; background:rgba(10,10,26,0.95);
        border:2px solid #0f3460; border-radius:10px; padding:16px; z-index:20;
      ">
        <div style="display:flex; gap:10px; align-items:flex-start">
          <div style="font-size:28px; flex-shrink:0">🧙</div>
          <div style="flex:1">
            <div id="npc-name" style="color:#ffd54f; font-size:12px; font-weight:bold; margin-bottom:4px"></div>
            <div id="npc-text" style="color:#ddd; font-size:13px; line-height:1.6"></div>
            <div id="npc-actions" style="margin-top:10px"></div>
          </div>
        </div>
        <button id="btn-close-dialog" style="
          position:absolute; top:8px; right:10px; background:none; border:none;
          color:#555; cursor:pointer; font-size:16px;">✕</button>
      </div>

      <!-- 조작 안내 -->
      <div style="
        position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
        font-size:10px; color:#333; white-space:nowrap; pointer-events:none;
      ">방향키 또는 클릭으로 이동 · NPC에게 다가가면 대화</div>
    `

    // 엔진 초기화
    setTimeout(() => this._initEngine(el), 0)

    // 메뉴 오버레이 (월드맵 위에 반투명 패널)
    el.innerHTML += `
      <div id="world-menu-overlay" style="
        display:none; position:absolute; inset:0; z-index:50;
        background:rgba(0,0,0,0.85); flex-direction:column;
      ">
        <div style="background:#16213e; border-bottom:1px solid #0f3460;
          padding:10px 16px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
          <span style="color:#e94560; font-weight:bold">☰ 메뉴</span>
          <button id="btn-close-menu" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:18px">✕</button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:16px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; max-width:360px; margin:0 auto;">
            ${[
              {id:'pets',     icon:'🐉', label:'내 에레멘탈'},
              {id:'stats',    icon:'📊', label:'스탯'},
              {id:'skills',   icon:'✨', label:'스킬'},
              {id:'items',    icon:'🎒', label:'아이템'},
              {id:'breeding', icon:'🧬', label:'교배'},
              {id:'gacha',    icon:'🎰', label:'가챠'},
              {id:'party',    icon:'👥', label:'파티'},
              {id:'quest',    icon:'📋', label:'퀘스트'},
              {id:'online',   icon:'🌐', label:'온라인'},
              {id:'equipment',icon:'⚔️', label:'장비'},
              {id:'faction',  icon:'⚖️', label:'세력'},
              {id:'story',    icon:'📖', label:'스토리'},
            ].map(m => `
              <button data-menu-tab="${m.id}" style="
                padding:14px 8px; background:#0f1a2e; border:1px solid #0f3460;
                border-radius:8px; cursor:pointer; color:#eee; font-size:13px;
                display:flex; align-items:center; gap:8px;
              "><span style="font-size:20px">${m.icon}</span>${m.label}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `

    // 이벤트
    el.querySelector('#btn-menu').addEventListener('click', () => {
      el.querySelector('#world-menu-overlay').style.display = 'flex'
    })
    el.querySelector('#btn-close-menu').addEventListener('click', () => {
      el.querySelector('#world-menu-overlay').style.display = 'none'
    })
    el.querySelectorAll('[data-menu-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelector('#world-menu-overlay').style.display = 'none'
        callbacks.onOpenTab(btn.dataset.menuTab)
      })
    })
    el.querySelector('#btn-close-dialog').addEventListener('click', () => this._closeDialog())

    this._el = el
    return el
  }

  async _initEngine(el) {
    const canvas = el.querySelector('#world-canvas')

    // 맵 데이터 로드 (실패 시 마을로 폴백)
    let mapData = await this._loadMap(this.mapState?.map_id ?? 'town')
    if (!mapData) mapData = await this._loadMap('town')
    if (!mapData) return

    mapData.startX = this.mapState?.tile_x ?? 7
    mapData.startY = this.mapState?.tile_y ?? 7

    // WorldEngine은 script 태그로 전역 로드됨
    this.engine = new WorldEngine(canvas, mapData, this.summoner)

    this.engine.on('onNpc',            npc    => this._showNpcDialog(npc))
    this.engine.on('onExit',           exit   => this._handleExit(exit))
    this.engine.on('onWildEncounter',  config => this._handleWildEncounter(config))
  }

  async _loadMap(mapId) {
    const res = await window.arcana.world.getMap({ mapId })
    return res.ok ? res.map : null
  }

  _showNpcDialog(npc) {
    const dialog = this._el.querySelector('#npc-dialog')
    this._el.querySelector('#npc-name').textContent = npc.name
    this._el.querySelector('#npc-text').textContent = npc.dialog?.[0] ?? ''

    const actions = this._el.querySelector('#npc-actions')
    actions.innerHTML = ''

    if (npc.hasFreeGacha) {
      window.arcana.summoner.hasFreeGachaUsed().then(used => {
        if (!used) {
          const btn = document.createElement('button')
          btn.style.cssText = `padding:8px 18px; background:linear-gradient(135deg,#e94560,#9b59b6);
            border:none; color:#fff; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;`
          btn.textContent = '✨ 무료 에레멘탈 소환 (1회)'
          btn.addEventListener('click', async () => {
            btn.disabled = true
            const res = await window.arcana.summoner.freeGacha()
            if (res.ok) {
              this.callbacks.onFreeGacha?.(res.pet, res.isHybrid)
              this._el.querySelector('#npc-text').textContent = '와! 훌륭한 에레멘탈이 나왔군요! 함께 강해지세요!'
              actions.innerHTML = ''
            }
          })
          actions.appendChild(btn)
        }
      })
    }

    dialog.style.display = 'block'
  }

  _closeDialog() {
    this._el.querySelector('#npc-dialog').style.display = 'none'
  }

  _handleWildEncounter(config) {
    // 야생 배틀 트리거 → 사냥터 시스템 연동
    this.callbacks.onWildBattle?.(config)
    // 일단 사냥터 창 열기로 연결
    window.arcana.hunting.open()
  }

  async _handleExit(exit) {
    if (!this.engine) return
    const mapData = await this._loadMap(exit.targetMap).catch(() => null)
    if (!mapData) return
    this.engine.setMap(mapData, exit.targetX, exit.targetY)
    // 현재 위치 저장
    const s = this.summoner
    window.arcana.summoner.saveMapState({
      summonerId: s.id,
      mapId: exit.targetMap,
      tileX: exit.targetX,
      tileY: exit.targetY,
    })
  }

  destroy() {
    this.engine?.destroy()
  }
}
