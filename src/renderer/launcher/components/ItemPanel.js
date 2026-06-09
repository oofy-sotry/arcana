class ItemPanel {
  constructor(pet, inventory) {
    this.pet       = pet
    this.inventory = inventory
  }

  render(onUse) {
    const el = document.createElement('div')
    el.style.cssText = 'padding:4px;'
    el.innerHTML = `<h3 style="margin-bottom:12px; color:#e94560">인벤토리</h3>`

    if (this.inventory.length === 0) {
      el.innerHTML += `<p style="color:#aaa">보유 아이템이 없습니다.</p>`
      return el
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
      row.querySelector('button').addEventListener('click', () => onUse(inv.item_id))
      el.appendChild(row)
    })

    return el
  }
}
