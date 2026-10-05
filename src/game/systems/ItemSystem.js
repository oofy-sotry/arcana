const ITEMS = require('../data/items')
const db = require('../../db/database')

class ItemSystem {
  constructor({ Pet, save, factionSystem }) {
    this.Pet  = Pet
    this.save = save
    this.factionSystem = factionSystem || null
  }

  // factionGate가 있는 아이템은 해당 세력 평판이 minRep 이상이어야 통과
  _passesFactionGate(item) {
    if (!item.factionGate) return true
    if (!this.factionSystem) return false
    return this.factionSystem.getRep(item.factionGate.faction) >= item.factionGate.minRep
  }

  addItem(petId, itemId, quantity = 1) {
    const item = ITEMS[itemId]
    if (!item) return false

    db.run(
      `INSERT INTO pet_inventory (pet_id, item_id, quantity) VALUES (?, ?, ?)
       ON CONFLICT(pet_id, item_id) DO UPDATE SET quantity = MIN(quantity + ?, ?)`,
      [petId, itemId, quantity, quantity, item.maxStack]
    )
    this.save()
    return true
  }

  // ─── 상점 구매 ─────────────────────────────────────────────────────
  getShopCatalog() {
    return Object.entries(ITEMS)
      .filter(([, item]) => item.shopPrice && this._passesFactionGate(item))
      .map(([itemId, item]) => ({ itemId, name: item.name, price: item.shopPrice }))
  }

  buyItem(petId, itemId, quantity = 1) {
    const item = ITEMS[itemId]
    if (!item || !item.shopPrice) return { ok: false, error: '상점에서 구매할 수 없는 아이템입니다' }
    if (!this._passesFactionGate(item)) return { ok: false, error: '세력 평판이 부족해 구매할 수 없습니다' }
    if (quantity < 1) return { ok: false, error: '수량은 1 이상이어야 합니다' }

    const pet = this.Pet.getPet(petId)
    if (!pet) return { ok: false, error: '펫을 찾을 수 없습니다' }

    const cost = item.shopPrice * quantity
    if ((pet.coins || 0) < cost) return { ok: false, error: `코인이 부족합니다 (필요: ${cost}, 보유: ${pet.coins || 0})` }

    this.Pet.updatePet(petId, { coins: pet.coins - cost })
    this.addItem(petId, itemId, quantity)
    return { ok: true, itemId, quantity, cost, remainingCoins: pet.coins - cost }
  }

  // ─── 상점 판매 ─────────────────────────────────────────────────────
  // 원작처럼 구매가의 절반. 상점가가 없는 아이템(부활석 등)은 팔 수 없음
  getSellPrice(itemId) {
    const item = ITEMS[itemId]
    return item?.shopPrice ? Math.floor(item.shopPrice / 2) : 0
  }

  sellItem(petId, itemId, quantity = 1) {
    const price = this.getSellPrice(itemId)
    if (!price) return { ok: false, error: '팔 수 없는 아이템입니다' }
    if (quantity < 1) return { ok: false, error: '수량은 1 이상이어야 합니다' }

    const row = db.query('SELECT quantity FROM pet_inventory WHERE pet_id = ? AND item_id = ?', [petId, itemId])[0]
    if (!row || row.quantity < quantity) return { ok: false, error: '가진 수량이 부족합니다' }
    const pet = this.Pet.getPet(petId)
    if (!pet) return { ok: false, error: '펫을 찾을 수 없습니다' }

    const earned = price * quantity
    db.run('UPDATE pet_inventory SET quantity = quantity - ? WHERE pet_id = ? AND item_id = ?', [quantity, petId, itemId])
    this.Pet.updatePet(petId, { coins: (pet.coins || 0) + earned })
    this.save()
    return { ok: true, itemId, quantity, earned, remainingCoins: (pet.coins || 0) + earned }
  }

  getInventory(petId) {
    const rows = db.query(
      'SELECT * FROM pet_inventory WHERE pet_id = ? AND quantity > 0',
      [petId]
    )
    return rows.map(row => ({
      ...row,
      data: ITEMS[row.item_id] || null,
    }))
  }

  useItem(pet, itemId) {
    const inv = db.query(
      'SELECT * FROM pet_inventory WHERE pet_id = ? AND item_id = ?',
      [pet.id, itemId]
    )
    if (inv.length === 0 || inv[0].quantity < 1) return { ok: false, reason: 'not_owned' }

    const item = ITEMS[itemId]
    if (!item) return { ok: false, reason: 'unknown_item' }

    const Pet = this.Pet
    switch (item.effect) {
      case 'hunger_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { hunger: Math.min(100, cond.hunger + 40) })
        Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.3) })
        break
      }
      case 'clean_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { cleanliness: Math.min(100, cond.cleanliness + 50) })
        Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.2) })
        break
      }
      case 'happy_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { happiness: Math.min(100, cond.happiness + 30) })
        Pet.updatePet(pet.id, { affinity: Math.min(100, (pet.affinity || 0) + 0.5) })
        break
      }
      case 'energy_restore': {
        const cond = Pet.getConditions(pet.id)
        Pet.updateConditions(pet.id, { energy: Math.min(100, (cond.energy || 0) + 50) })
        break
      }
      case 'evolve_boost':
        break

      case 'death_rate_down': {
        // 생명의 부적: 다음 패배 1번을 기절 횟수에 안 넣고 죽음도 막음 — FaintSystem.recordLoss에서 소비
        db.run(
          "INSERT OR REPLACE INTO world_state (key, value) VALUES (?, '1')",
          [`death_shield_${pet.id}`]
        )
        break
      }

      case 'revive': {
        // 부활석: 죽을 상황에서 1번 버티고 기절 횟수 0으로 살아남음 — FaintSystem.recordLoss에서 소비
        db.run(
          "INSERT OR REPLACE INTO world_state (key, value) VALUES (?, '1')",
          [`auto_revive_${pet.id}`]
        )
        break
      }

      case 'dark_evolve': {
        if ((pet.evolution_stage || 0) >= 4) return { ok: false, reason: 'max_stage' }
        const CHARACTERS = require('../data/characters')
        const DARK_BONUS = 0.20
        const fromStage  = pet.evolution_stage || 0
        const toStage    = fromStage + 1
        const nextChar   = Object.values(CHARACTERS).find(
          c => c.attribute === pet.attribute && c.stage === toStage
        )
        const updates = {
          evolution_stage: toStage,
          attribute2: 'dark',
          hp:      Math.ceil((pet.hp      || 100) * (1 + DARK_BONUS)),
          mp:      Math.ceil((pet.mp      || 100) * (1 + DARK_BONUS)),
          attack:  Math.ceil((pet.attack  || 10)  * (1 + DARK_BONUS)),
          defense: Math.ceil((pet.defense || 5)   * (1 + DARK_BONUS)),
          speed:   Math.ceil((pet.speed   || 10)  * (1 + DARK_BONUS)),
        }
        if (nextChar) updates.name = nextChar.name
        Pet.updatePet(pet.id, updates)
        db.run(
          `INSERT INTO evolution_log (pet_id, from_stage, to_stage, evo_type, evolved_at) VALUES (?,?,?,?,?)`,
          [pet.id, fromStage, toStage, 'dark', Date.now()]
        )
        break
      }

      case 'none':
        // 재료 아이템(evo_stone 등) — 직접 사용 불가, 진화 시스템이 소비
        return { ok: false, reason: 'material_not_consumable' }

      default:
        return { ok: false, reason: 'unhandled_effect' }
    }

    db.run(
      'UPDATE pet_inventory SET quantity = quantity - 1 WHERE pet_id = ? AND item_id = ?',
      [pet.id, itemId]
    )
    this.save()
    return { ok: true, effect: item.effect }
  }
}

module.exports = ItemSystem
