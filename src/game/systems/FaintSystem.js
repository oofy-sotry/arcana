const { toDayKey, daysBetween } = require('../utils/time')

const MAX_FAINTS = 3 // 기절 3번까지는 기절, 그다음 패배는 죽음

// 기절 시스템 — 패배 시 기절/죽음 판정, 하루 경과 감소, 회복소 치료
class FaintSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  isFainted(pet) {
    return Number(pet?.is_fainted) === 1
  }

  // 하루가 지날 때마다 기절 횟수 -1 (0 미만 불가). 처음 보는 펫은 오늘부터 셈
  applyDailyDecay(pet, today = toDayKey()) {
    const count = pet.faint_count || 0
    if (!pet.faint_decay_day) {
      this.Pet.updatePet(pet.id, { faint_decay_day: today })
      return count
    }
    const days = daysBetween(pet.faint_decay_day, today)
    if (days === 0) return count
    const next = Math.max(0, count - days)
    this.Pet.updatePet(pet.id, { faint_count: next, faint_decay_day: today })
    return next
  }

  // 전투 패배 — 기절 횟수가 이미 MAX_FAINTS면 죽음. 생명의 부적(death_shield)은 이번 기절을 횟수에 안 넣고
  // 죽음도 막음. 죽은 펫은 부활석으로 되살림(revive)
  recordLoss(petOrId) {
    const pet   = this.Pet.getPet(typeof petOrId === 'object' ? petOrId.id : petOrId)
    if (!pet) return null
    const count = pet.faint_count || 0

    if (this._consumeFlag(`death_shield_${pet.id}`)) {
      this.Pet.updatePet(pet.id, { is_fainted: 1 })
      return { fainted: true, died: false, shielded: true, faintCount: count }
    }
    if (count >= MAX_FAINTS) {
      this.Pet.updatePet(pet.id, { is_alive: 0, is_fainted: 0 })
      return { fainted: false, died: true, faintCount: count }
    }
    this.Pet.updatePet(pet.id, { faint_count: count + 1, is_fainted: 1 })
    return { fainted: true, died: false, faintCount: count + 1 }
  }

  getDeadPets() {
    return this.Pet.getDeadPets()
  }

  // 부활석 — 죽은 펫을 기절 횟수 0, HP·MP 가득 찬 상태로 되살림
  revive(petId) {
    const pet = this.Pet.getPet(petId)
    if (!pet || Number(pet.is_alive) === 1) return { ok: false, error: '죽은 에레멘탈이 아닙니다' }
    this.Pet.updatePet(petId, { is_alive: 1, is_fainted: 0, faint_count: 0, cur_hp: null, cur_mp: null })
    this.save?.()
    return { ok: true, name: pet.name }
  }

  // 회복소 치료 — 기절 상태를 풀고 HP·MP를 가득 채움(언제든), 기절 횟수 -1은 펫마다 하루 1번
  treat(pet, today = toDayKey()) {
    const count     = pet.faint_count || 0
    const canReduce = count > 0 && pet.last_treated_day !== today
    const fields    = { is_fainted: 0, cur_hp: null, cur_mp: null }
    if (canReduce) {
      fields.faint_count      = count - 1
      fields.last_treated_day = today
    }
    this.Pet.updatePet(pet.id, fields)
    this.save?.()
    return { revived: this.isFainted(pet), reduced: canReduce, faintCount: canReduce ? count - 1 : count }
  }

  _consumeFlag(key) {
    const db  = require('../../db/database')
    const row = db.query('SELECT value FROM world_state WHERE key = ?', [key])[0]
    if (row?.value !== '1') return false
    db.run('DELETE FROM world_state WHERE key = ?', [key])
    return true
  }
}

FaintSystem.MAX_FAINTS = MAX_FAINTS
module.exports = FaintSystem
