// PixiJS 씬 초기화 및 게임 루프
let app, petSprite
let currentPet    = null
let currentZoneId = 'beginner'
let mode          = 'manual' // 'auto' | 'manual'
let energy        = 100

const SPEED = 2.5

async function initScene() {
  const wrap = document.getElementById('canvas-wrap')
  const W    = wrap.clientWidth
  const H    = wrap.clientHeight

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

function spawnPetSprite() {
  if (!app) return
  if (petSprite) { app.stage.removeChild(petSprite); petSprite = null }

  const g = new PIXI.Graphics()
  g.circle(0, 0, 16).fill(0xe94560)
  const tex = app.renderer.generateTexture(g)
  petSprite = new PIXI.Sprite(tex)
  petSprite.anchor.set(0.5)
  petSprite.x = app.screen.width  / 2
  petSprite.y = app.screen.height / 2
  app.stage.addChild(petSprite)
  g.destroy()
}

async function init() {
  await initScene()

  const zones = await window.arcana.hunting.getZones()
  const sel   = document.getElementById('zone-select')
  zones.forEach(z => {
    const opt       = document.createElement('option')
    opt.value       = z.id
    opt.textContent = z.name
    sel.appendChild(opt)
  })
  sel.addEventListener('change', () => { currentZoneId = sel.value })

  const pets = await window.arcana.pet.getAll()
  if (pets.length > 0) {
    currentPet = pets[0]
    updateEnergyDisplay()
    spawnPetSprite()
  }

  document.getElementById('btn-mode-auto').addEventListener('click', startAutoMode)
  document.getElementById('btn-mode-manual').addEventListener('click', () => setMode('manual'))
  document.getElementById('btn-explore').addEventListener('click', onExplore)
}

function setMode(m) {
  mode = m
  document.getElementById('btn-mode-auto').style.background   = m === 'auto'   ? '#e94560' : '#0f3460'
  document.getElementById('btn-mode-manual').style.background = m === 'manual' ? '#e94560' : '#0f3460'
}

function updateEnergyDisplay() {
  const cond = currentPet?.conditions
  const e    = (cond?.energy != null) ? Math.round(cond.energy) : energy
  document.getElementById('energy-display').textContent = `에너지: ${e}/100`
}

async function startAutoMode() {
  if (!currentPet) return
  setMode('auto')
  addLog('🤖 자동 사냥 시작...')
  const result = await window.arcana.hunting.startAuto({ petId: currentPet.id, zoneId: currentZoneId })
  if (result?.error) { addLog(`⚠ ${result.error}`); setMode('manual'); return }
  if (result?.battles) {
    addLog(`전투 ${result.battles.length}회 완료, 잔여 에너지: ${Math.round(result.finalEnergy)}`)
    result.battles.forEach(b => {
      addLog(`  ${b.monster}: ${b.result}`)
    })
  }
  setMode('manual')
}

async function onExplore() {
  if (!currentPet) return
  const result = await window.arcana.hunting.explore({ petId: currentPet.id, mode })
  if (result?.error) { addLog(`⚠ ${result.error}`); return }
  if (result.type === 'item')  addLog(`💎 아이템 발견: ${result.itemId}`)
  if (result.type === 'coins') addLog(`💰 코인 획득: ${result.coins}`)
  if (result.type === 'trap')  addLog(`🪤 덫! -${result.damage} HP`)
  if (result.type === 'empty') addLog('— 아무것도 없었다.')
  addLog(`잔여 에너지: ${Math.round(result.finalEnergy)}`)
}

function addLog(msg) {
  const log = document.getElementById('combat-log')
  const p   = document.createElement('p')
  p.textContent = msg
  log.appendChild(p)
  log.scrollTop = log.scrollHeight
}

document.addEventListener('DOMContentLoaded', init)
