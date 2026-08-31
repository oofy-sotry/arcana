const ATTR_EMOJI_C  = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🌍', thunder: '⚡', ice: '❄️', poison: '☠️', dragon: '🐉', light: '🌟', dark: '🌑' }

// index.html 기준 상대경로 — src/renderer/launcher/ → 프로젝트 루트까지 3단계
const SPRITE_BASE_C = '../../../assets/sprites/characters/'

class CollectionPanel {
  constructor(entries) {
    this.entries = entries
  }

  _createCell(entry) {
    const cell = document.createElement('div')
    cell.style.cssText = 'width:72px; display:flex; flex-direction:column; align-items:center; gap:4px'

    const iconWrap = document.createElement('div')
    iconWrap.style.cssText = 'width:48px; height:48px; display:flex; align-items:center; justify-content:center; background:#16213e; border:1px solid #0f3460; border-radius:6px'

    if (entry.discovered) {
      const img = document.createElement('img')
      img.src   = `${SPRITE_BASE_C}${entry.attribute}_${entry.stage}.png`
      img.style.cssText = 'width:48px; height:48px; object-fit:contain'
      img.onerror = () => {
        iconWrap.innerHTML = ''
        const span = document.createElement('span')
        span.style.cssText = 'font-size:28px'
        span.textContent = ATTR_EMOJI_C[entry.attribute] || '❓'
        iconWrap.appendChild(span)
      }
      iconWrap.appendChild(img)
    } else {
      const span = document.createElement('span')
      span.style.cssText = 'font-size:22px; color:#555'
      span.textContent = '🔒'
      iconWrap.appendChild(span)
    }

    const label = document.createElement('div')
    label.style.cssText = `font-size:11px; text-align:center; color:${entry.discovered ? '#eee' : '#555'}`
    label.textContent = entry.discovered ? entry.name : '???'

    cell.appendChild(iconWrap)
    cell.appendChild(label)
    return cell
  }

  render() {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px'

    const attrs = [...new Set(this.entries.map(e => e.attribute))]
    attrs.forEach(attribute => {
      const row = document.createElement('div')
      row.style.cssText = 'margin-bottom:16px'

      const header = document.createElement('div')
      header.style.cssText = 'color:#aaa; font-size:13px; margin-bottom:6px'
      header.textContent = `${ATTR_EMOJI_C[attribute] || ''} ${attribute}`
      row.appendChild(header)

      const cellsWrap = document.createElement('div')
      cellsWrap.style.cssText = 'display:flex; gap:10px'
      this.entries
        .filter(e => e.attribute === attribute)
        .sort((a, b) => a.stage - b.stage)
        .forEach(entry => cellsWrap.appendChild(this._createCell(entry)))
      row.appendChild(cellsWrap)

      el.appendChild(row)
    })

    return el
  }
}
