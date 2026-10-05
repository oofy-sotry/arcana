// PixiJS 씬 초기화 및 게임 루프
let app, petSprite
let currentPet    = null
let currentZoneId = 'beginner'
let mode          = 'manual' // 'auto' | 'manual'
let energy        = 100
let inBattle      = false // 턴 연출 중 — 이동·충돌·버튼 잠금

// 월드 풀밭 야생 조우로 열렸으면 ?zone=&monster= — 그 1마리와 싸우고 자동 복귀
const encounter = (() => {
  const q = new URLSearchParams(location.search)
  return q.get('zone') && q.get('monster') ? { zoneId: q.get('zone'), monsterId: q.get('monster') } : null
})()

const SPEED = 2.5
const ATTACK_RANGE = 80 // 공격(Space)으로 싸울 수 있는 몬스터까지의 거리(px)
const NO_PET_MSG = '⚠ 사냥할 펫이 없습니다 — 마을의 미르린에게 무료 소환을 받은 뒤 다시 오세요'
const keys  = {} // 현재 누르고 있는 키 추적

async function initScene() {
  const wrap = document.getElementById('canvas-wrap')
  const W    = wrap.clientWidth
  const H    = wrap.clientHeight

  // PIXI 기본값은 blob 워커로 이미지 디코딩 검사를 하는데, 워커엔 이 페이지의 메타 CSP가
  // 적용되지 않아 default-src 'self'로 막혀 매번 CSP 에러가 남 — 메인 스레드 디코딩으로 고정
  PIXI.Assets.setPreferences({ preferWorkers: false })
  app = new PIXI.Application()
  await app.init({
    width:            W,
    height:           H,
    backgroundColor:  0x1a1a2e,
    antialias:        false,
    resolution:       window.devicePixelRatio || 1,
    autoDensity:      true,
  })
  wrap.appendChild(app.canvas)
  drawBackground()

  window._monsterRenderer = new MonsterRenderer(app.stage, W, H, app.renderer)
}

function drawBackground() {
  const g   = new PIXI.Graphics()
  const W   = app.screen.width
  const H   = app.screen.height
  const SZ  = 64
  for (let x = 0; x < W; x += SZ) {
    for (let y = 0; y < H; y += SZ) {
      const shade = ((x / SZ + y / SZ) % 2 === 0) ? 0x1e2a3a : 0x1a2535
      g.rect(x, y, SZ, SZ).fill(shade)
    }
  }
  app.stage.addChild(g)
}

// index.html 기준 상대경로 — src/renderer/hunting/ → 프로젝트 루트까지 3단계
const PET_SPRITE_BASE = '../../../assets/sprites/characters/'

async function spawnPetSprite() {
  if (!app || !currentPet) return
  if (petSprite) { app.stage.removeChild(petSprite); petSprite = null }

  let tex
  try {
    const spriteId = currentPet.species === 'OmnirexHidden' ? 'omnirex'
      : (currentPet.species && currentPet.species !== 'default') ? currentPet.species.toLowerCase() : currentPet.attribute
    const spriteSuffix = currentPet.species === 'OmnirexHidden' ? '_hidden' : ''
    tex = await PIXI.Assets.load(`${PET_SPRITE_BASE}${spriteId}_${currentPet.evolution_stage}${spriteSuffix}.png`)
  } catch {
    // 이미지가 없는 종·단계 → 종+속성+단계 시드 도트 스프라이트
    tex = PIXI.Texture.from(PixelSprite.toCanvas({
      seed: `${currentPet.species}_${currentPet.attribute}_${currentPet.evolution_stage}`,
      attribute: currentPet.attribute, kind: 'pet',
    }))
    tex.source.scaleMode = 'nearest'
  }
  petSprite = new PIXI.Sprite(tex)
  petSprite.anchor.set(0.5)
  petSprite.width  = 40
  petSprite.height = 40
  petSprite.x = app.screen.width  / 2
  petSprite.y = app.screen.height / 2
  app.stage.addChild(petSprite)
}

async function loadZoneMonsters(zoneId) {
  const monsters = await window.arcana.hunting.zoneMonsters({ zoneId })
  window._currentZoneMonsters = monsters
  if (window._monsterRenderer) {
    window._monsterRenderer.clearAll()
    const spawnCount = Math.min(3, monsters.length)
    for (let i = 0; i < spawnCount; i++) {
      window._monsterRenderer.spawnMonster(monsters[Math.floor(Math.random() * monsters.length)])
    }
  }
}

async function init() {
  await initScene()

  const pets  = await window.arcana.pet.getAll()
  const zones = await window.arcana.hunting.getZones({ petId: pets[0]?.id })
  const sel   = document.getElementById('zone-select')
  zones.forEach(z => {
    const opt       = document.createElement('option')
    opt.value       = z.id
    // ★ 추천(레벨 적정 + 승산 있음) / (불리) 승산이 크게 낮음 — edge는 펫이 있을 때만 계산됨
    const tag = z.recommended && z.edge != null ? '★ ' : ''
    const warn = z.edge != null && z.edge < 0.8 ? ' (불리)' : ''
    opt.textContent = `${tag}${z.name}${warn}`
    sel.appendChild(opt)
  })
  // 기본 구역: 추천 구역 중 승산이 가장 높은 곳, 없으면 목록 첫 구역
  const best = zones.filter(z => z.recommended && z.edge != null).sort((a, b) => b.edge - a.edge)[0]
  if (zones.length > 0) currentZoneId = (best || zones[0]).id
  if (encounter) currentZoneId = encounter.zoneId
  sel.value = currentZoneId
  sel.addEventListener('change', () => {
    currentZoneId = sel.value
    loadZoneMonsters(currentZoneId)
  })

  window._combatUI = new CombatUI()
  window._battleScreen = new BattleScreen(document.getElementById('battle-overlay'))

  if (pets.length > 0) {
    currentPet = pets[0]
    updateEnergyDisplay()
    await spawnPetSprite()
    window._combatUI.setPetHp(currentPet.hp || 100, currentPet.hp || 100)
  } else {
    addLog(NO_PET_MSG)
  }

  document.getElementById('btn-back').addEventListener('click', () => window.arcana.hunting.close())
  document.getElementById('btn-mode-auto').addEventListener('click', startAutoMode)
  document.getElementById('btn-mode-manual').addEventListener('click', () => setMode('manual'))
  document.getElementById('btn-explore').addEventListener('click', onExplore)
  document.getElementById('btn-attack').addEventListener('click', onManualAttack)
  document.getElementById('btn-flee').addEventListener('click', onFlee)

  setupKeyboard()
  app.ticker.add(onTick)

  // 초기 구역 몬스터 스폰 (조우 모드는 그 1마리만)
  if (encounter) await setupEncounter()
  else if (currentZoneId) await loadZoneMonsters(currentZoneId)
}

// 조우 모드 화면 — 구역 선택·자동 사냥·탐사를 숨기고 그 몬스터 1마리만 펫 앞에 스폰(리스폰 없음)
async function setupEncounter() {
  for (const id of ['zone-label', 'zone-select', 'btn-mode-auto', 'btn-mode-manual', 'btn-explore']) {
    document.getElementById(id).style.display = 'none'
  }
  window._currentZoneMonsters = []

  const banner   = document.getElementById('encounter-banner')
  banner.style.display = 'inline'
  const monsters = await window.arcana.hunting.zoneMonsters({ zoneId: encounter.zoneId })
  const monster  = monsters.find(m => m.id === encounter.monsterId)
  if (!monster) {
    banner.textContent = '몬스터를 찾을 수 없습니다'
    document.getElementById('btn-attack').style.display = 'none'
    return
  }
  banner.textContent = `야생의 ${monster.name}이(가) 나타났다!`
  window._monsterRenderer.clearAll()
  await window._monsterRenderer.spawnMonster(monster, { x: app.screen.width / 2 + 64, y: app.screen.height / 2 })
  if (!currentPet) document.getElementById('btn-attack').style.display = 'none'
}

// 조우 전투가 끝나면 결과를 잠깐 보여주고 자동 복귀(도망은 즉시), 에러면 복귀 버튼(도망/마을로)만 남김
function finishEncounter(result) {
  if (result.error) {
    document.getElementById('btn-attack').style.display = 'none'
    return
  }
  if (result.result === 'ran') { returnToWorld(); return }
  setBattleLock(true) // 복귀 대기 중 추가 행동 막기
  addLog('잠시 후 원래 자리로 돌아갑니다...')
  setTimeout(returnToWorld, 1500)
}

function returnToWorld() {
  window.arcana.hunting.close()
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    keys[e.code] = true
    if (e.code === 'Space')  { e.preventDefault(); onManualAttack() }
    if (e.code === 'Escape') { e.preventDefault(); onFlee() }
  })
  document.addEventListener('keyup', e => { keys[e.code] = false })
}

function onTick() {
  if (!petSprite || mode !== 'manual' || inBattle) return
  const W = app.screen.width
  const H = app.screen.height
  if (keys['ArrowLeft']  || keys['KeyA']) petSprite.x = Math.max(16, petSprite.x - SPEED)
  if (keys['ArrowRight'] || keys['KeyD']) petSprite.x = Math.min(W - 16, petSprite.x + SPEED)
  if (keys['ArrowUp']    || keys['KeyW']) petSprite.y = Math.max(16, petSprite.y - SPEED)
  if (keys['ArrowDown']  || keys['KeyS']) petSprite.y = Math.min(H - 16, petSprite.y + SPEED)
  if (window._monsterRenderer) window._monsterRenderer.checkCollision(petSprite, onCollide)
}

// 공격(Space/버튼) — 반경 안의 가장 가까운 몬스터와 전투
async function onManualAttack() {
  if (!currentPet) { addLog(NO_PET_MSG); return }
  if (mode !== 'manual' || inBattle) return
  const target = nearestMonster()
  if (!target) { addLog('몬스터에게 가까이 가세요'); return }
  await engage(target.data, target.sprite)
}

// 전투 후 처리 — 전멸이면 회복소로(서버가 위치를 옮겨 둠), 조우 모드면 복귀
async function engage(monster, sprite) {
  const result = await fightMonster(monster, sprite)
  if (!result) return
  if (result.result === 'lost') { returnToWorld(); return }
  if (encounter) finishEncounter(result)
}

function nearestMonster() {
  if (!petSprite || !window._monsterRenderer) return null
  let best = null
  let bestDist = ATTACK_RANGE
  for (const m of window._monsterRenderer.monsters) {
    const dist = Math.hypot(m.sprite.x - petSprite.x, m.sprite.y - petSprite.y)
    if (dist <= bestDist) { best = m; bestDist = dist }
  }
  return best
}

// 화면의 그 몬스터와 턴제 전투 → 이기거나 잡으면 그 몬스터 제거
async function fightMonster(monster, sprite) {
  if (inBattle || !currentPet) return null
  setBattleLock(true)
  try {
    const res = await window._battleScreen.run({ zoneId: currentZoneId, monsterId: monster.id })
    if (res.error) { addLog(`⚠ ${res.error}`); return res }

    const { outcome } = res
    const label = { won: '승리!', lost: '전멸…', ran: '도망쳤다', captured: '포획 성공!' }[outcome.result]
    addLog(`⚔ ${monster.name}: ${label}`)
    if (outcome.drops?.length) addLog(`  드롭: ${outcome.drops.map(d => d.itemId).join(', ')}`)
    if (outcome.result === 'won' || outcome.result === 'captured') {
      window._monsterRenderer.removeMonster(sprite, { respawn: !encounter })
    }
    await refreshPet()
    return outcome
  } finally {
    knockBack(sprite)
    setBattleLock(false)
  }
}

// 전투 뒤 에너지 등 최신 펫 정보로 갱신
async function refreshPet() {
  const pets = await window.arcana.pet.getAll()
  currentPet = pets.find(p => p.id === currentPet?.id) || pets[0] || null
  updateEnergyDisplay()
}

// 몬스터가 아직 살아 있으면 펫을 떼어놓음 — 겹친 채로 끝나 곧바로 다시 충돌 전투가 나는 것 방지
function knockBack(monsterSprite) {
  if (!petSprite || !monsterSprite || monsterSprite.destroyed) return
  const dx   = petSprite.x - monsterSprite.x
  const dy   = petSprite.y - monsterSprite.y
  const dist = Math.hypot(dx, dy)
  if (dist >= 48) return
  const ux = dist > 0 ? dx / dist : -1
  const uy = dist > 0 ? dy / dist : 0
  petSprite.x = Math.max(16, Math.min(app.screen.width  - 16, monsterSprite.x + ux * 48))
  petSprite.y = Math.max(16, Math.min(app.screen.height - 16, monsterSprite.y + uy * 48))
}

// 패배 후 기절/죽음 안내 (FaintSystem.recordLoss 결과)
function faintMessage(faint) {
  const name = currentPet?.name ?? '펫'
  if (faint.died)     return `💀 ${name}이(가) 쓰러져 다시 일어나지 못했다... (부활석으로 되살릴 수 있다)`
  if (faint.shielded) return `🛡 생명의 부적이 ${name}을(를) 지켜줬다 (기절 횟수 그대로)`
  return `😵 ${name}이(가) 기절했다! (기절 ${faint.faintCount}/3 — 회복소에서 치료하세요)`
}

function setBattleLock(on) {
  inBattle = on
  for (const id of ['btn-attack', 'btn-flee', 'btn-explore', 'btn-mode-auto', 'zone-select']) {
    document.getElementById(id).disabled = on
  }
}

function showHiddenStageOverlay(result) {
  const overlay = document.getElementById('hidden-stage-overlay')
  const battlesEl = document.getElementById('hs-battles')
  const banner    = document.getElementById('hs-result-banner')
  const closeBtn  = document.getElementById('hs-close')

  battlesEl.innerHTML = ''
  result.battles.forEach((b, i) => {
    const row = document.createElement('div')
    row.style.cssText = `
      background: ${b.won ? '#0f3020' : '#3a0f0f'};
      border: 1px solid ${b.won ? '#2ecc71' : '#e94560'};
      border-radius: 6px; padding: 8px 14px;
      color: ${b.won ? '#2ecc71' : '#e94560'}; font-size: 13px;
    `
    row.textContent = `전투 ${i + 1}: ${b.monsterId} — ${b.won ? '승리 ✓' : '패배 ✗'}`
    battlesEl.appendChild(row)
  })

  if (result.allWon) {
    banner.style.cssText = 'background:#1a1a2e;border:2px solid #ffb300;color:#ffb300'
    banner.textContent   = '✨ 전원 격파! 전설 아이템 획득 가능!'
  } else {
    banner.style.cssText = 'background:#1a1a2e;border:2px solid #555;color:#aaa'
    banner.textContent   = '히든 스테이지 종료'
  }

  if (result.drops?.length) {
    addLog(`[히든] 드롭: ${result.drops.map(d => d.itemId).join(', ')}`)
  }
  addLog(`[히든] 에너지: ${Math.round(result.finalEnergy)}`)

  overlay.classList.add('show')
  closeBtn.onclick = () => overlay.classList.remove('show')
}

async function onFlee() {
  if (inBattle) return
  addLog('🏃 도망쳤다!')
  if (encounter) returnToWorld()
}

// 부딪힌 그 몬스터와 바로 전투
function onCollide(monster, sprite) {
  if (inBattle || !currentPet) return
  addLog(`👾 ${monster.name} 출현!`)
  engage(monster, sprite)
}

function setMode(m) {
  mode = m
  document.getElementById('btn-mode-auto').style.background   = m === 'auto'   ? '#e94560' : '#0f3460'
  document.getElementById('btn-mode-manual').style.background = m === 'manual' ? '#e94560' : '#0f3460'
}

function updateEnergyDisplay(overrideEnergy) {
  const e = overrideEnergy != null
    ? Math.round(overrideEnergy)
    : Math.round(currentPet?.conditions?.energy ?? energy)
  document.getElementById('energy-display').textContent = `에너지: ${e}/100`
}

async function startAutoMode() {
  if (!currentPet) { addLog(NO_PET_MSG); return }
  setMode('auto')
  addLog('🤖 자동 사냥 시작...')
  const result = await window.arcana.hunting.startAuto({ petId: currentPet.id, zoneId: currentZoneId })
  if (result?.error) { addLog(`⚠ ${result.error}`); setMode('manual'); return }
  if (result?.battles) {
    addLog(`전투 ${result.battles.length}회 완료, 잔여 에너지: ${Math.round(result.finalEnergy)}`)
    result.battles.forEach(b => { addLog(`  ${b.monster}: ${b.result}`) })
    const lastFaint = result.battles.at(-1)?.faint
    if (lastFaint) addLog(faintMessage(lastFaint))
    updateEnergyDisplay(result.finalEnergy)
  }
  setMode('manual')
}

async function onExplore() {
  if (!currentPet) { addLog(NO_PET_MSG); return }
  const result = await window.arcana.hunting.explore({ petId: currentPet.id, mode })
  if (result?.error) { addLog(`⚠ ${result.error}`); return }
  if (result.type === 'item')  addLog(`💎 아이템 발견: ${result.itemId}`)
  if (result.type === 'coins') addLog(`💰 코인 획득: ${result.coins}`)
  if (result.type === 'trap')  addLog(`🪤 덫! -${result.damage} HP`)
  if (result.type === 'empty') addLog('— 아무것도 없었다.')
  addLog(`잔여 에너지: ${Math.round(result.finalEnergy)}`)
  updateEnergyDisplay(result.finalEnergy)
}

function addLog(msg) {
  const log = document.getElementById('combat-log')
  const p   = document.createElement('p')
  p.textContent = msg
  log.appendChild(p)
  log.scrollTop = log.scrollHeight
}

document.addEventListener('DOMContentLoaded', init)
