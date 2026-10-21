// 4종 외형 정의
const APPEARANCES = [
  { id: 'male_a',   label: '남성 A', hair: '#1a1a1a', robe: '#e94560', skin: '#f5c99a' },
  { id: 'male_b',   label: '남성 B', hair: '#e8e8e8', robe: '#4a90e2', skin: '#f5c99a' },
  { id: 'female_a', label: '여성 A', hair: '#8B4513', robe: '#4caf50', skin: '#f5c99a' },
  { id: 'female_b', label: '여성 B', hair: '#9c27b0', robe: '#9b59b6', skin: '#f5d5b0' },
]

function drawSummonerPreview(canvas, ap, selected) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  // 배경
  ctx.fillStyle = selected ? '#0f3460' : '#16213e'
  ctx.fillRect(0, 0, W, H)
  if (selected) {
    ctx.strokeStyle = '#e94560'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, W - 2, H - 2)
  }

  const cx = W / 2, baseY = H - 18
  const S = 3 // pixel scale

  // 망토/몸통
  ctx.fillStyle = ap.robe
  ctx.fillRect(cx - 5 * S, baseY - 9 * S, 10 * S, 9 * S)

  // 소매
  ctx.fillStyle = ap.robe
  ctx.fillRect(cx - 8 * S, baseY - 8 * S, 3 * S, 6 * S)
  ctx.fillRect(cx + 5 * S, baseY - 8 * S, 3 * S, 6 * S)

  // 손
  ctx.fillStyle = ap.skin
  ctx.fillRect(cx - 8 * S, baseY - 3 * S, 2 * S, 2 * S)
  ctx.fillRect(cx + 6 * S, baseY - 3 * S, 2 * S, 2 * S)

  // 다리
  ctx.fillStyle = '#333'
  ctx.fillRect(cx - 4 * S, baseY - 1 * S, 3 * S, 4 * S)
  ctx.fillRect(cx + 1 * S, baseY - 1 * S, 3 * S, 4 * S)

  // 신발
  ctx.fillStyle = '#111'
  ctx.fillRect(cx - 4 * S, baseY + 3 * S, 4 * S, 2 * S)
  ctx.fillRect(cx + 1 * S, baseY + 3 * S, 4 * S, 2 * S)

  // 목
  ctx.fillStyle = ap.skin
  ctx.fillRect(cx - 1 * S, baseY - 10 * S, 2 * S, 2 * S)

  // 얼굴
  ctx.fillStyle = ap.skin
  ctx.fillRect(cx - 3 * S, baseY - 16 * S, 6 * S, 7 * S)

  // 눈
  ctx.fillStyle = '#333'
  ctx.fillRect(cx - 2 * S, baseY - 14 * S, S, S)
  ctx.fillRect(cx + S,     baseY - 14 * S, S, S)

  // 머리카락
  ctx.fillStyle = ap.hair
  ctx.fillRect(cx - 3 * S, baseY - 17 * S, 6 * S, 3 * S)
  // 옆머리
  ctx.fillRect(cx - 4 * S, baseY - 16 * S, S, 4 * S)
  ctx.fillRect(cx + 3 * S, baseY - 16 * S, S, 4 * S)

  // 이름 라벨
  ctx.fillStyle = selected ? '#e94560' : '#888'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(ap.label, cx, H - 4)
}

class SummonerCreate {
  constructor() {
    this.selectedAppearance = 'male_a'
  }

  render(onCreated) {
    const el = document.createElement('div')
    el.style.cssText = `
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      height:100%; background:#0a0a1a; overflow-y:auto;
    `
    el.innerHTML = `
      <div style="max-width:400px; width:100%; padding:24px 16px; text-align:center">
        <div style="font-size:48px; margin-bottom:12px">🧙</div>
        <h2 style="color:#e94560; font-size:22px; margin-bottom:6px">소환사 생성</h2>
        <p style="color:#888; font-size:12px; margin-bottom:24px">외형과 이름을 선택하세요</p>

        <!-- 외형 선택 -->
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px">
          ${APPEARANCES.map(ap => `<canvas id="ap-${ap.id}" width="72" height="88"
            style="border-radius:6px; cursor:pointer; display:block; width:100%"></canvas>`).join('')}
        </div>

        <!-- 이름 입력 -->
        <input id="summoner-name" placeholder="소환사 이름 (최대 12자)" maxlength="12"
          style="width:100%; padding:12px; background:#16213e; border:1px solid #0f3460;
          color:#eee; border-radius:8px; font-size:15px; text-align:center;
          margin-bottom:12px; outline:none; box-sizing:border-box" />

        <button id="btn-confirm-summoner" style="
          width:100%; padding:13px; background:#e94560; border:none; color:#fff;
          border-radius:8px; cursor:pointer; font-size:15px; letter-spacing:1px;
          margin-bottom:8px;
        ">여정을 시작합니다</button>

        <div id="create-error" style="color:#e94560; font-size:12px; min-height:18px"></div>
      </div>
    `

    // Canvas 초기 렌더링
    const redrawAll = () => {
      APPEARANCES.forEach(ap => {
        const canvas = el.querySelector(`#ap-${ap.id}`)
        drawSummonerPreview(canvas, ap, ap.id === this.selectedAppearance)
      })
    }
    setTimeout(redrawAll, 0)

    // 외형 선택 이벤트
    APPEARANCES.forEach(ap => {
      el.querySelector(`#ap-${ap.id}`).addEventListener('click', () => {
        this.selectedAppearance = ap.id
        redrawAll()
      })
    })

    const nameInput = el.querySelector('#summoner-name')
    const errEl     = el.querySelector('#create-error')

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.querySelector('#btn-confirm-summoner').click()
    })

    el.querySelector('#btn-confirm-summoner').addEventListener('click', async () => {
      const name = nameInput.value.trim()
      if (!name) { errEl.textContent = '이름을 입력하세요'; return }
      const res = await window.arcana.summoner.create({ name, appearance: this.selectedAppearance })
      if (res.ok) {
        onCreated(res.summoner)
      } else {
        errEl.textContent = res.error
      }
    })

    setTimeout(() => nameInput.focus(), 50)
    return el
  }
}
