// EquipmentPanel — 장비 인벤토리 / 착용 슬롯 / 강화
class EquipmentPanel {
  constructor(pet, inventory, equipped) {
    this.pet       = pet
    this.inventory = inventory  // EquipmentSystem.getInventory(petId)
    this.equipped  = equipped   // EquipmentSystem.getEquipped(petId)
  }

  render(onRefresh) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'padding:4px'

    if (!this.pet) {
      wrap.innerHTML = '<p style="color:#aaa;text-align:center;margin-top:40px">에레멘탈을 먼저 선택하세요</p>'
      return wrap
    }

    wrap.innerHTML = `
      <h3 style="color:#e94560;margin-bottom:12px">⚔ 장비 관리 — ${this.pet.name}</h3>

      <!-- 착용 슬롯 -->
      <div style="margin-bottom:16px">
        <h4 style="color:#ccc;margin-bottom:8px;font-size:13px">착용 중</h4>
        <div id="eq-slots" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
      </div>

      <!-- 인벤토리 -->
      <div>
        <h4 style="color:#ccc;margin-bottom:8px;font-size:13px">인벤토리 (${this.inventory.length})</h4>
        <div id="eq-inv" style="display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto"></div>
      </div>
    `

    this._renderSlots(wrap.querySelector('#eq-slots'), onRefresh)
    this._renderInventory(wrap.querySelector('#eq-inv'), onRefresh)
    return wrap
  }

  _renderSlots(container, onRefresh) {
    const SLOTS = ['weapon', 'armor', 'accessory']
    const SLOT_LABEL = { weapon: '⚔ 무기', armor: '🛡 방어구', accessory: '💍 장신구' }

    for (const slot of SLOTS) {
      const item = this.equipped.find(e => e.slot === slot)
      const box  = document.createElement('div')
      box.style.cssText = `
        background:#16213e; border:1px solid ${item ? '#e94560' : '#0f3460'};
        border-radius:6px; padding:10px; text-align:center; min-height:80px;
      `
      if (item && item.name) {
        box.innerHTML = `
          <div style="font-size:11px;color:#aaa;margin-bottom:4px">${SLOT_LABEL[slot]}</div>
          <div style="font-size:13px;color:${this._gradeColor(item.grade)};font-weight:bold">${item.name}</div>
          <div style="font-size:11px;color:#aaa">+${item.enhance_level || 0} ${item.grade}</div>
          <div style="font-size:11px;color:#7ec8e3;margin-top:4px">${this._statsStr(item.stats)}</div>
          <button data-slot="${slot}" class="btn-unequip"
            style="margin-top:6px;padding:2px 8px;background:#0f3460;border:none;color:#aaa;border-radius:4px;cursor:pointer;font-size:11px">
            해제
          </button>
        `
      } else {
        box.innerHTML = `
          <div style="font-size:11px;color:#aaa;margin-bottom:4px">${SLOT_LABEL[slot]}</div>
          <div style="color:#444;font-size:22px;margin-top:8px">—</div>
        `
      }
      container.appendChild(box)
    }

    container.querySelectorAll('.btn-unequip').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.arcana.equipment.unequip({ petId: this.pet.id, slot: btn.dataset.slot })
        onRefresh()
      })
    })
  }

  _renderInventory(container, onRefresh) {
    if (!this.inventory.length) {
      container.innerHTML = '<p style="color:#444;font-size:12px;text-align:center">장비가 없습니다</p>'
      return
    }

    for (const item of this.inventory) {
      const row = document.createElement('div')
      row.style.cssText = `
        background:#16213e; border:1px solid #0f3460; border-radius:6px;
        padding:8px 10px; display:flex; align-items:center; gap:8px;
      `
      row.innerHTML = `
        <div style="flex:1">
          <span style="color:${this._gradeColor(item.grade)};font-weight:bold;font-size:13px">${item.name}</span>
          <span style="color:#aaa;font-size:11px;margin-left:6px">+${item.enhance_level}</span>
          <span style="color:#555;font-size:11px;margin-left:4px">${item.slot}</span>
          <div style="color:#7ec8e3;font-size:11px;margin-top:2px">${this._statsStr(item.stats)}</div>
        </div>
        <div style="display:flex;gap:4px">
          ${item.is_equipped
            ? `<span style="font-size:11px;color:#e94560;padding:2px 6px;border:1px solid #e94560;border-radius:4px">착용중</span>`
            : `<button data-id="${item.id}" class="btn-equip"
                style="padding:2px 8px;background:#0f3460;border:1px solid #1a4a7a;color:#eee;border-radius:4px;cursor:pointer;font-size:11px">착용</button>`
          }
          <button data-id="${item.id}" class="btn-enhance"
            style="padding:2px 8px;background:#1a1a2e;border:1px solid #0f3460;color:#aaa;border-radius:4px;cursor:pointer;font-size:11px">
            강화 (${item.enhance_level}/10)
          </button>
        </div>
      `
      container.appendChild(row)
    }

    container.querySelectorAll('.btn-equip').forEach(btn => {
      btn.addEventListener('click', async () => {
        const res = await window.arcana.equipment.equip({ petId: this.pet.id, inventoryId: Number(btn.dataset.id) })
        if (res.ok) onRefresh()
        else alert(res.error)
      })
    })

    container.querySelectorAll('.btn-enhance').forEach(btn => {
      btn.addEventListener('click', async () => {
        const res = await window.arcana.equipment.enhance({ petId: this.pet.id, inventoryId: Number(btn.dataset.id) })
        if (res.ok) {
          alert(res.success
            ? `강화 성공! +${res.toLevel} (성공률 ${Math.round(res.rate * 100)}%)`
            : `강화 실패 (성공률 ${Math.round(res.rate * 100)}%)`)
          onRefresh()
        } else {
          alert(res.error)
        }
      })
    })
  }

  _gradeColor(grade) {
    return { normal: '#ccc', rare: '#4fc3f7', epic: '#ce93d8', legendary: '#ffb300' }[grade] || '#ccc'
  }

  _statsStr(stats) {
    if (!stats) return ''
    return Object.entries(stats)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}+${v}`)
      .join(' ')
  }
}
