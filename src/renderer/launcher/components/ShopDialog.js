// 상점 점원 대화 — 골드버전 상점처럼 사기 / 팔기 / 그만두기
// 코인과 가방은 펫마다 따로라서 선두 펫(목록 첫 번째) 기준으로 거래한다
const SHOP_BTN_S = 'padding:6px 14px; border:none; border-radius:5px; cursor:pointer; font-size:12px;'

class ShopDialog {
  constructor(container, { onClose }) {
    this.container = container
    this.onClose   = onClose
    this.pet       = null
    this.message   = ''
  }

  async open() {
    const pets = await window.arcana.pet.getAll()
    this.pet = pets[0] || null
    this._renderMenu()
  }

  _frame(bodyHtml) {
    const coins = this.pet ? `<div style="font-size:11px; color:#ffd54f; margin-bottom:6px">💰 ${this.pet.coins || 0} 코인 (${this.pet.name})</div>` : ''
    const msg   = this.message ? `<div style="font-size:12px; color:#ddd; margin-bottom:6px">${this.message}</div>` : ''
    this.container.innerHTML = `${coins}${msg}${bodyHtml}`
  }

  _renderMenu() {
    if (!this.pet) {
      this._frame('<div style="font-size:12px; color:#aaa">에레멘탈이 있어야 거래할 수 있어요.</div>')
      return
    }
    this._frame(`
      <div style="display:flex; gap:6px">
        <button data-act="buy"  style="${SHOP_BTN_S} background:#2ecc71; color:#0a0a1a">사기</button>
        <button data-act="sell" style="${SHOP_BTN_S} background:#4fc3f7; color:#0a0a1a">팔기</button>
        <button data-act="quit" style="${SHOP_BTN_S} background:#333; color:#ddd">그만두기</button>
      </div>`)
    this.container.querySelector('[data-act="buy"]').onclick  = () => this._renderBuy()
    this.container.querySelector('[data-act="sell"]').onclick = () => this._renderSell()
    this.container.querySelector('[data-act="quit"]').onclick = () => this.onClose?.()
  }

  _list(rows, label, onPick) {
    const items = rows.map((r, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #1a2540">
        <span style="font-size:12px; color:#eee">${r.name}${r.quantity != null ? ` <span style="color:#888">×${r.quantity}</span>` : ''}</span>
        <span>
          <span style="font-size:11px; color:#ffd54f; margin-right:8px">${r.price} 코인</span>
          <button data-row="${i}" style="${SHOP_BTN_S} padding:3px 10px; background:#e94560; color:#fff">${label}</button>
        </span>
      </div>`).join('')
    this._frame(`
      <div style="max-height:200px; overflow-y:auto; margin-bottom:8px">${items || '<div style="font-size:12px; color:#aaa">팔 수 있는 물건이 없어요.</div>'}</div>
      <button data-act="back" style="${SHOP_BTN_S} background:#333; color:#ddd">돌아가기</button>`)
    this.container.querySelectorAll('[data-row]').forEach(btn => {
      btn.onclick = () => onPick(rows[Number(btn.dataset.row)])
    })
    this.container.querySelector('[data-act="back"]').onclick = () => { this.message = ''; this._renderMenu() }
  }

  async _renderBuy() {
    const catalog = await window.arcana.item.getShop()
    this._list(catalog, '사기', async row => {
      const res = await window.arcana.item.buy({ petId: this.pet.id, itemId: row.itemId, quantity: 1 })
      if (res.ok) this.pet.coins = res.remainingCoins
      this.message = res.ok ? `${row.name}을(를) 샀습니다. 고맙습니다!` : `⚠ ${res.error}`
      this._renderBuy()
    })
  }

  async _renderSell() {
    const rows = await window.arcana.item.getSellList({ petId: this.pet.id })
    this._list(rows, '팔기', async row => {
      const res = await window.arcana.item.sell({ petId: this.pet.id, itemId: row.itemId, quantity: 1 })
      if (res.ok) this.pet.coins = res.remainingCoins
      this.message = res.ok ? `${row.name}을(를) ${res.earned} 코인에 팔았습니다.` : `⚠ ${res.error}`
      this._renderSell()
    })
  }
}
