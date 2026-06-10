// StoryPanel — 챕터 스토리 화면 (대화 트리 + 세력 선택지)
const STORY_CHAPTERS = [
  {
    id: 0,
    title: '프롤로그: 첫 계약',
    bg: '#0a0a1a',
    accent: '#e94560',
    narration: [
      '태초의 균열에서 여덟 속성의 에레멘탈이 태어났다.',
      '빛의 세력 Luxis와 어둠의 세력 Noctis는 오랜 세월 대립해왔다.',
      '당신은 두 세력 사이 어딘가에서 첫 에레멘탈과 계약을 맺는다.',
    ],
    choices: null,
  },
  {
    id: 1,
    title: '1장: 첫 계약',
    bg: '#0a0a1a',
    accent: '#ffd54f',
    narration: [
      'Luxis의 사자가 찾아왔다.',
      '"당신의 에레멘탈은 특별합니다. 우리와 함께라면 빛의 힘을 깨울 수 있어요."',
      '같은 날 밤, Noctis의 전령도 나타났다.',
      '"빛이 전부가 아닙니다. 어둠 속에 더 깊은 진실이 있소."',
    ],
    choices: [
      { label: 'Luxis의 제안을 수락한다', effects: { luxis: 15 }, desc: 'Luxis 평판 +15' },
      { label: 'Noctis의 제안을 수락한다', effects: { noctis: 15 }, desc: 'Noctis 평판 +15' },
      { label: '양쪽 모두 거절한다', effects: { luxis: 5, noctis: 5 }, desc: 'Luxis +5, Noctis +5 (균형 유지)' },
    ],
  },
  {
    id: 2,
    title: '2장: 속성 지역 탐방',
    bg: '#0d1a0a',
    accent: '#66bb6a',
    narration: [
      '에레멘탈과 함께 각 속성의 사냥터를 돌아다니며 세력의 흔적을 발견했다.',
      '불꽃 지대 깊은 곳에서 혼합 속성 에레멘탈의 봉인된 알을 발견했다.',
      '두 세력 모두 그 알을 원하고 있다.',
    ],
    choices: [
      { label: 'Luxis에게 알을 넘긴다', effects: { luxis: 20 }, desc: 'Luxis 평판 +20' },
      { label: 'Noctis에게 알을 넘긴다', effects: { noctis: 20 }, desc: 'Noctis 평판 +20' },
      { label: '알을 직접 부화시킨다', effects: { luxis: 5, noctis: 5, hybridRescue: 1 }, desc: '혼합구원 +1, 균형 유지' },
    ],
  },
  {
    id: 3,
    title: '3장: 혼합 속성과 대반전',
    bg: '#1a0a1a',
    accent: '#ce93d8',
    narration: [
      '혼합 속성 에레멘탈들이 두 세력 모두에게 박해받고 있다는 사실을 알게 됐다.',
      '봉인된 크리스탈 속에서 목소리가 들려온다.',
      '"균형... 균형이 깨지면 모든 것이 혼돈으로 돌아갑니다."',
      '이것은 단순한 세력 다툼이 아니었다.',
    ],
    choices: [
      { label: '혼합 에레멘탈을 보호하기로 결심한다', effects: { hybridRescue: 2, soulFusion: 10 }, desc: '혼합구원 +2, 영혼동화도 +10' },
      { label: 'Luxis의 정의를 믿고 따른다', effects: { luxis: 25 }, desc: 'Luxis 평판 +25' },
      { label: 'Noctis의 힘을 빌린다', effects: { noctis: 25 }, desc: 'Noctis 평판 +25' },
    ],
  },
  {
    id: 4,
    title: '4장: 거짓된 전면전',
    bg: '#1a0a0a',
    accent: '#ef5350',
    narration: [
      'Luxis와 Noctis가 마침내 전면전을 선포했다.',
      '그러나 당신은 알고 있다 — 이 전쟁의 배후에 더 큰 어둠이 있다는 것을.',
      '전쟁이 격화될수록 봉인된 크리스탈이 공명하기 시작한다.',
      '영혼동화도가 임계점에 달하면 무언가가 깨어날 것이다.',
    ],
    choices: [
      { label: 'Luxis 편에 서서 싸운다', effects: { luxis: 30 }, desc: 'Luxis 평판 +30' },
      { label: 'Noctis 편에 서서 싸운다', effects: { noctis: 30 }, desc: 'Noctis 평판 +30' },
      { label: '전쟁을 중단시키려 한다', effects: { luxis: 10, noctis: 10, soulFusion: 20 }, desc: '균형 유지, 영혼동화도 +20' },
    ],
  },
  {
    id: 5,
    title: '5장: 옴니렉스의 탄생',
    bg: '#0a0a1a',
    accent: '#ffb300',
    narration: [
      '균열의 중심에서 모든 속성을 품은 존재 — 옴니렉스가 깨어나려 하고 있다.',
      '당신이 걸어온 길이 이 순간을 만들었다.',
      '세 개의 선택지가 당신 앞에 놓여 있다.',
    ],
    choices: [
      { label: '[Luxis 엔딩] 빛으로 봉인한다', effects: { luxis: 50 }, desc: '요구: Luxis 70+', requireLuxis: 70 },
      { label: '[Noctis 엔딩] 어둠으로 흡수한다', effects: { noctis: 50 }, desc: '요구: Noctis 70+', requireNoctis: 70 },
      { label: '[히든 엔딩] 혼돈(混)의 균형을 택한다', effects: { soulFusion: 50 }, desc: '요구: 히든 엔딩 조건 달성', requireHidden: true },
    ],
  },
]

class StoryPanel {
  constructor(chapter, repData, soulFusion, hiddenCond) {
    this.chapter    = chapter    // 현재 챕터 번호 (0-5)
    this.rep        = repData    // { luxis, noctis }
    this.soul       = soulFusion
    this.hiddenCond = hiddenCond
    this._reading   = null       // 현재 읽고 있는 챕터 데이터
  }

  render(onChapterAdvance) {
    this._onAdvance = onChapterAdvance
    const wrap = document.createElement('div')
    wrap.style.cssText = 'padding:4px'
    wrap.innerHTML = `
      <h3 style="color:#e94560;margin-bottom:16px">📖 스토리</h3>
      <div id="story-chapters" style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px"></div>
      <div id="story-reader" style="display:none"></div>
    `
    this._renderChapterList(wrap.querySelector('#story-chapters'))
    this._chaptersEl = wrap.querySelector('#story-chapters')
    this._readerEl   = wrap.querySelector('#story-reader')
    return wrap
  }

  _renderChapterList(container) {
    const unlocked = this.chapter  // 0부터 chapter까지 읽기 가능

    STORY_CHAPTERS.forEach(ch => {
      const isUnlocked   = ch.id <= unlocked
      const isCurrent    = ch.id === unlocked
      const isCompleted  = ch.id < unlocked

      const row = document.createElement('div')
      row.style.cssText = `
        background: ${isCurrent ? '#16213e' : '#0d1117'};
        border: 1px solid ${isCurrent ? ch.accent : isCompleted ? '#1a4a2a' : '#1a1a2e'};
        border-radius: 8px; padding: 12px 16px;
        display: flex; align-items: center; gap: 12px;
        cursor: ${isUnlocked ? 'pointer' : 'default'};
        opacity: ${isUnlocked ? '1' : '0.35'};
      `
      row.innerHTML = `
        <span style="font-size:20px">${isCompleted ? '✅' : isCurrent ? '▶' : '🔒'}</span>
        <div style="flex:1">
          <div style="font-size:14px;color:${isUnlocked ? ch.accent : '#555'};font-weight:bold">${ch.title}</div>
          ${isCurrent ? `<div style="font-size:11px;color:#aaa;margin-top:2px">진행 중</div>` : ''}
          ${isCompleted ? `<div style="font-size:11px;color:#2ecc71;margin-top:2px">완료</div>` : ''}
        </div>
        ${isUnlocked ? `<span style="color:#aaa;font-size:18px">›</span>` : ''}
      `
      if (isUnlocked) {
        row.addEventListener('click', () => this._openChapter(ch))
      }
      container.appendChild(row)
    })
  }

  _openChapter(ch) {
    this._chaptersEl.style.display = 'none'
    this._readerEl.style.display   = 'block'
    this._reading = ch
    this._renderReader(ch)
  }

  _renderReader(ch) {
    const isCurrentChapter = ch.id === this.chapter
    this._readerEl.innerHTML = `
      <div style="background:${ch.bg};border:1px solid ${ch.accent};border-radius:8px;padding:20px;margin-bottom:12px">
        <h4 style="color:${ch.accent};margin-bottom:16px;font-size:16px">${ch.title}</h4>
        <div id="story-narration" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
          ${ch.narration.map(line => `
            <p style="color:#ddd;font-size:13px;line-height:1.7;padding-left:10px;border-left:2px solid ${ch.accent}40">${line}</p>
          `).join('')}
        </div>
        ${ch.choices ? this._renderChoices(ch, isCurrentChapter) : ''}
      </div>
      <button id="story-back"
        style="padding:6px 18px;background:#0f3460;border:1px solid #1a4a7a;color:#eee;border-radius:4px;cursor:pointer;font-size:13px">
        ← 챕터 목록
      </button>
    `

    this._readerEl.querySelector('#story-back').addEventListener('click', () => {
      this._readerEl.style.display   = 'none'
      this._chaptersEl.style.display = 'flex'
      this._chaptersEl.style.flexDirection = 'column'
    })

    if (ch.choices && isCurrentChapter) {
      this._readerEl.querySelectorAll('.story-choice').forEach((btn, i) => {
        btn.addEventListener('click', () => this._makeChoice(ch, i))
      })
    }
  }

  _renderChoices(ch, isCurrentChapter) {
    if (!isCurrentChapter) {
      return `<p style="color:#555;font-size:12px;text-align:center">이미 완료된 챕터입니다.</p>`
    }

    return `
      <div style="display:flex;flex-direction:column;gap:8px">
        <p style="color:#aaa;font-size:12px;margin-bottom:4px">선택하세요:</p>
        ${ch.choices.map((c, i) => {
          const disabled = this._isChoiceDisabled(ch, c)
          return `
            <button class="story-choice" data-index="${i}"
              ${disabled ? 'disabled' : ''}
              style="
                text-align:left; padding:10px 14px;
                background:${disabled ? '#0a0a1a' : '#16213e'};
                border:1px solid ${disabled ? '#1a1a2e' : ch.accent + '80'};
                border-radius:6px; cursor:${disabled ? 'not-allowed' : 'pointer'};
                color:${disabled ? '#444' : '#eee'}; font-size:13px;
                transition: background 0.15s;
              ">
              <div style="font-weight:bold;margin-bottom:3px">${c.label}</div>
              <div style="font-size:11px;color:${disabled ? '#333' : '#888'}">${c.desc}</div>
              ${disabled ? `<div style="font-size:10px;color:#555;margin-top:2px">${this._disabledReason(c)}</div>` : ''}
            </button>
          `
        }).join('')}
      </div>
    `
  }

  _isChoiceDisabled(ch, choice) {
    if (choice.requireLuxis  && this.rep.luxis  < choice.requireLuxis)  return true
    if (choice.requireNoctis && this.rep.noctis < choice.requireNoctis) return true
    if (choice.requireHidden && (!this.hiddenCond || !this.hiddenCond.allMet)) return true
    return false
  }

  _disabledReason(choice) {
    if (choice.requireLuxis)  return `Luxis ${this.rep.luxis} / ${choice.requireLuxis} 필요`
    if (choice.requireNoctis) return `Noctis ${this.rep.noctis} / ${choice.requireNoctis} 필요`
    if (choice.requireHidden) return '히든 엔딩 조건 미달성'
    return ''
  }

  async _makeChoice(ch, choiceIndex) {
    const choice  = ch.choices[choiceIndex]
    const effects = choice.effects || {}

    // 챕터 전진 + effects를 백엔드에서 일괄 처리
    const result = await window.arcana.faction.advanceChapter({ chapter: ch.id + 1, effects })

    // 결과 표시
    const effectDesc = Object.entries(effects)
      .map(([k, v]) => `${k} +${v}`)
      .join(', ')

    this._readerEl.innerHTML = `
      <div style="background:#0d1117;border:1px solid #2ecc71;border-radius:8px;padding:24px;text-align:center">
        <div style="font-size:32px;margin-bottom:12px">✨</div>
        <h4 style="color:#2ecc71;margin-bottom:8px">선택 완료</h4>
        <p style="color:#eee;font-size:14px;margin-bottom:8px">"${choice.label}"</p>
        <p style="color:#aaa;font-size:12px;margin-bottom:20px">${effectDesc}</p>
        <p style="color:#ffd54f;font-size:13px">다음 챕터가 열렸습니다.</p>
      </div>
      <button id="story-done"
        style="margin-top:12px;padding:8px 24px;background:#e94560;border:none;color:#fff;border-radius:6px;cursor:pointer;font-size:14px">
        확인
      </button>
    `
    this._readerEl.querySelector('#story-done').addEventListener('click', () => {
      if (this._onAdvance) this._onAdvance()
    })
  }
}
