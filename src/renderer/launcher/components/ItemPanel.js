class ItemPanel {
  constructor(pet, inventory, shopCatalog = []) {
    this.pet         = pet
    this.inventory   = inventory
    this.shopCatalog = shopCatalog
    this._tab        = 'owned' // 'owned' | 'shop'
  }

  render(onUse, onBuy) {
    this._onUse = onUse
    this._onBuy = onBuy

    const el = document.createElement('div')
    el.style.cssText = 'padding:4px;'
    el.innerHTML = `
      <h3 style="margin-bottom:12px; color:#e94560">인벤토리</h3>
      <div style="display:flex; gap:6px; margin-bottom:12px">
        <button id="item-tab-owned" style="flex:1; padding:6px; border:none; border-radius:4px; cursor:pointer; font-size:12px;
          background:${this._tab === 'owned' ? '#e94560' : '#16213e'}; color:#fff;">보유</button>
        <button id="item-tab-shop" style="flex:1; padding:6px; border:none; border-radius:4px; cursor:pointer; font-size:12px;
          background:${this._tab === 'shop' ? '#e94560' : '#16213e'}; color:#fff;">구매</button>
      </div>
      <div id="item-tab-body"></div>
    `

    this._el   = el
    this._body = el.querySelector('#item-tab-body')
    el.querySelector('#item-tab-owned').addEventListener('click', () => { this._tab = 'owned'; this._rerender() })
    el.querySelector('#item-tab-shop').addEventListener('click',  () => { this._tab = 'shop';  this._rerender() })

    this._renderBody()
    return el
  }

  _rerender() {
    const fresh = this.render(this._onUse, this._onBuy)
    this._el.replaceWith(fresh)
    this._el = fresh
  }

  _renderBody() {
    if (this._tab === 'shop') this._renderShop()
    else this._renderOwned()
  }

  _renderOwned() {
    if (this.inventory.length === 0) {
      this._body.innerHTML = `<p style="color:#aaa">보유 아이템이 없습니다.</p>`
      return
    }

    this.inventory.forEach(inv => {
      const data = inv.data || {}
      const row  = document.createElement('div')
      row.style.cssText = 'background:#16213e; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;'
      row.innerHTML = `
        <div>
          <div style="font-weight:bold">${data.name || inv.item_id}</div>
          <div style="font-size:11px; color:#aaa">× ${inv.quantity}</div>
        </div>
        <button data-item="${inv.item_id}" style="padding:4px 12px; background:#e94560; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:12px">
          사용
        </button>`
      row.querySelector('button').addEventListener('click', () => this._onUse(inv.item_id))
      this._body.appendChild(row)
    })
  }

  _renderShop() {
    this._body.innerHTML = `<p style="font-size:11px; color:#aaa; margin-bottom:8px">보유 코인: ${this.pet.coins || 0}</p>`

    if (this.shopCatalog.length === 0) {
      this._body.innerHTML += `<p style="color:#aaa">판매 중인 아이템이 없습니다.</p>`
      return
    }

    this.shopCatalog.forEach(({ itemId, name, price }) => {
      const row = document.createElement('div')
      row.style.cssText = 'background:#16213e; border-radius:6px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;'
      row.innerHTML = `
        <div>
          <div style="font-weight:bold">${name}</div>
          <div style="font-size:11px; color:#ffd54f">${price} 코인</div>
        </div>
        <button data-item="${itemId}" style="padding:4px 12px; background:#2ecc71; border:none; color:#0a0a1a; border-radius:4px; cursor:pointer; font-size:12px">
          구매
        </button>`
      row.querySelector('button').addEventListener('click', () => this._onBuy(itemId))
      this._body.appendChild(row)
    })
  }
}
