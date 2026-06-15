class SummonerCreate {
  render(onCreated) {
    const el = document.createElement('div')
    el.style.cssText = `
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      height:100%; background:#0a0a1a;
    `
    el.innerHTML = `
      <div style="max-width:340px; width:100%; padding:0 16px; text-align:center">
        <div style="font-size:48px; margin-bottom:16px">🧙</div>
        <h2 style="color:#e94560; font-size:24px; margin-bottom:8px">소환사 생성</h2>
        <p style="color:#888; font-size:13px; margin-bottom:28px">당신의 이름을 알려주세요</p>

        <input id="summoner-name" placeholder="소환사 이름 (최대 12자)" maxlength="12"
          style="width:100%; padding:14px; background:#16213e; border:1px solid #0f3460;
          color:#eee; border-radius:8px; font-size:16px; text-align:center;
          margin-bottom:14px; outline:none; box-sizing:border-box" />

        <button id="btn-confirm-summoner" style="
          width:100%; padding:14px; background:#e94560; border:none; color:#fff;
          border-radius:8px; cursor:pointer; font-size:16px; letter-spacing:1px;
          margin-bottom:10px;
        ">여정을 시작합니다</button>

        <div id="create-error" style="color:#e94560; font-size:12px; min-height:18px"></div>
      </div>
    `

    const nameInput = el.querySelector('#summoner-name')
    const errEl     = el.querySelector('#create-error')

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.querySelector('#btn-confirm-summoner').click()
    })

    el.querySelector('#btn-confirm-summoner').addEventListener('click', async () => {
      const name = nameInput.value.trim()
      if (!name) { errEl.textContent = '이름을 입력하세요'; return }
      const res = await window.arcana.summoner.create({ name })
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
