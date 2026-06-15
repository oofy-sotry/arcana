class StartScreen {
  render(onStart) {
    const el = document.createElement('div')
    el.style.cssText = `
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      height:100%; background:#0a0a1a; user-select:none;
    `
    el.innerHTML = `
      <div style="text-align:center; animation: fadeIn 1s ease">
        <div style="font-size:64px; margin-bottom:12px">⚡</div>
        <h1 style="font-size:52px; color:#e94560; margin-bottom:6px; letter-spacing:6px; font-weight:900">ARCANA</h1>
        <p style="color:#555; font-size:14px; letter-spacing:3px; margin-bottom:56px">에레멘탈 소환사의 여정</p>
        <button id="btn-game-start" style="
          padding:14px 56px; background:#e94560; border:none; color:#fff;
          border-radius:8px; cursor:pointer; font-size:18px; letter-spacing:2px;
          box-shadow:0 0 24px #e9456060; transition:transform 0.1s;
        ">게임 시작하기</button>
      </div>
      <style>
        @keyframes fadeIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        #btn-game-start:hover { transform:scale(1.04) }
        #btn-game-start:active { transform:scale(0.97) }
      </style>
    `
    el.querySelector('#btn-game-start').addEventListener('click', onStart)
    return el
  }
}
