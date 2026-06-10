const { QUESTS } = require('../data/quests')

const BASIC_ATTRS = ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon']
const ALL_ATTRS   = [...BASIC_ATTRS, 'light', 'dark']

class QuestSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  _getToday() {
    return new Date().toISOString().slice(0, 10)
  }

  _ensureProgress(questId, isDaily) {
    const db    = require('../../db/database')
    const today = this._getToday()
    const existing = db.query('SELECT id FROM quest_progress WHERE quest_id = ?', [questId])
    if (existing.length === 0) {
      db.run(
        `INSERT INTO quest_progress (quest_id, reset_date) VALUES (?, ?)`,
        [questId, isDaily ? today : null]
      )
    }
  }

  _checkUnlock(quest) {
    const db   = require('../../db/database')
    const pets = this.Pet.getAllPets()

    switch (quest.unlock.type) {
      case 'always':
        return true

      case 'has_attribute': {
        const attr = quest.unlock.attribute
        return pets.some(p => p.attribute === attr || p.attribute2 === attr)
      }

      case 'all_basic_attrs':
        return BASIC_ATTRS.every(attr =>
          pets.some(p => p.attribute === attr || p.attribute2 === attr)
        )

      case 'has_hybrid':
        return pets.some(p => p.attribute2)

      case 'party_full': {
        const cnt = db.query('SELECT COUNT(*) AS cnt FROM party_members')[0]?.cnt ?? 0
        return Number(cnt) >= 3
      }

      case 'all_attributes':
        return ALL_ATTRS.every(attr =>
          pets.some(p => p.attribute === attr || p.attribute2 === attr)
        )

      case 'quest_complete': {
        const req = db.query(
          'SELECT claimed_at FROM quest_progress WHERE quest_id = ?',
          [quest.unlock.required_quest]
        )[0]
        return !!(req?.claimed_at)
      }

      default:
        return false
    }
  }

  getProgress(quest) {
    const db    = require('../../db/database')
    const today = this._getToday()
    const pets  = this.Pet.getAllPets()

    switch (quest.condition.type) {
      case 'activity': {
        const col = quest.daily ? 'date' : null
        if (quest.daily) {
          const row = db.query(
            'SELECT count FROM daily_activity WHERE date = ? AND activity = ?',
            [today, quest.condition.activity]
          )[0]
          return Number(row?.count ?? 0)
        }
        // 비일일 퀘스트는 전체 누적값
        const row = db.query(
          'SELECT COALESCE(SUM(count), 0) AS total FROM daily_activity WHERE activity = ?',
          [quest.condition.activity]
        )[0]
        return Number(row?.total ?? 0)
      }

      case 'all_basic_attrs':
        return BASIC_ATTRS.filter(attr =>
          pets.some(p => p.attribute === attr || p.attribute2 === attr)
        ).length

      case 'has_hybrid':
        return pets.some(p => p.attribute2) ? 1 : 0

      case 'party_full': {
        const cnt = db.query('SELECT COUNT(*) AS cnt FROM party_members')[0]?.cnt ?? 0
        return Math.min(Number(cnt), quest.condition.target)
      }

      case 'all_attributes':
        return ALL_ATTRS.filter(attr =>
          pets.some(p => p.attribute === attr || p.attribute2 === attr)
        ).length

      default:
        return 0
    }
  }

  getUnlockStatus(quest) {
    const db  = require('../../db/database')
    const row = db.query('SELECT completed_at, claimed_at FROM quest_progress WHERE quest_id = ?', [quest.id])[0]

    if (row?.claimed_at)   return 'claimed'
    if (!this._checkUnlock(quest)) return 'locked'
    if (this.getProgress(quest) >= quest.condition.target) return 'completed'
    return 'active'
  }

  getAllStatuses() {
    const db    = require('../../db/database')
    const today = this._getToday()

    return QUESTS.map(quest => {
      this._ensureProgress(quest.id, quest.daily)

      // 일일 퀘스트: 날짜 바뀌면 claimed_at 초기화
      if (quest.daily) {
        const row = db.query(
          'SELECT reset_date, claimed_at FROM quest_progress WHERE quest_id = ?',
          [quest.id]
        )[0]
        if (row?.claimed_at && row.reset_date !== today) {
          db.run(
            `UPDATE quest_progress
             SET completed_at = NULL, claimed_at = NULL, reset_date = ?
             WHERE quest_id = ?`,
            [today, quest.id]
          )
        }
      }

      const status   = this.getUnlockStatus(quest)
      const progress = this.getProgress(quest)
      const row      = db.query(
        'SELECT completed_at, claimed_at FROM quest_progress WHERE quest_id = ?',
        [quest.id]
      )[0]

      // 새롭게 완료된 퀘스트 DB 반영
      if (status === 'completed' && !row?.completed_at) {
        db.run(
          'UPDATE quest_progress SET completed_at = ? WHERE quest_id = ?',
          [Date.now(), quest.id]
        )
      }

      return {
        ...quest,
        status,
        progress,
        completed_at: row?.completed_at ?? null,
        claimed_at:   row?.claimed_at   ?? null,
      }
    })
  }

  _resetDailyIfNeeded() {
    const db    = require('../../db/database')
    const today = this._getToday()

    QUESTS.filter(q => q.daily).forEach(quest => {
      const row = db.query(
        'SELECT reset_date, claimed_at FROM quest_progress WHERE quest_id = ?',
        [quest.id]
      )[0]
      if (row?.claimed_at && row.reset_date !== today) {
        db.run(
          `UPDATE quest_progress
           SET completed_at = NULL, claimed_at = NULL, reset_date = ?
           WHERE quest_id = ?`,
          [today, quest.id]
        )
      }
    })
  }

  recordActivity(activity, amount = 1) {
    const db    = require('../../db/database')
    const today = this._getToday()
    this._resetDailyIfNeeded()

    const existing = db.query(
      'SELECT count FROM daily_activity WHERE date = ? AND activity = ?',
      [today, activity]
    )[0]

    if (existing) {
      db.run(
        'UPDATE daily_activity SET count = count + ? WHERE date = ? AND activity = ?',
        [amount, today, activity]
      )
    } else {
      db.run(
        'INSERT INTO daily_activity (date, activity, count) VALUES (?, ?, ?)',
        [today, activity, amount]
      )
    }
  }

  getFactionRep() {
    const db   = require('../../db/database')
    const rows = db.query('SELECT faction, reputation FROM faction_rep')
    const result = { luxis: 50, noctis: 50 }
    rows.forEach(r => { result[r.faction] = Number(r.reputation) })
    return result
  }

  claimReward(questId, petId) {
    const db    = require('../../db/database')
    const quest = QUESTS.find(q => q.id === questId)
    if (!quest) return { ok: false, reason: 'quest_not_found' }

    const row = db.query(
      'SELECT completed_at, claimed_at FROM quest_progress WHERE quest_id = ?',
      [questId]
    )[0]
    if (!row || !row.completed_at) return { ok: false, reason: 'not_completed' }
    if (row.claimed_at)            return { ok: false, reason: 'already_claimed' }

    const pet = this.Pet.getPet(petId)
    if (!pet) return { ok: false, reason: 'pet_not_found' }

    this.Pet.updatePet(petId, {
      coins: (pet.coins || 0) + quest.reward.coins,
      exp:   (pet.exp   || 0) + quest.reward.exp,
    })

    if (quest.reward.faction && quest.reward.faction_rep) {
      db.run(
        `UPDATE faction_rep
         SET reputation = MIN(100, MAX(0, reputation + ?))
         WHERE faction = ?`,
        [quest.reward.faction_rep, quest.reward.faction]
      )
    }

    db.run(
      `INSERT INTO quest_reward_log (quest_id, pet_id, coins, exp, claimed_at)
       VALUES (?, ?, ?, ?, ?)`,
      [questId, petId, quest.reward.coins, quest.reward.exp, Date.now()]
    )

    db.run(
      'UPDATE quest_progress SET claimed_at = ? WHERE quest_id = ?',
      [Date.now(), questId]
    )

    this.save()
    return { ok: true, reward: quest.reward }
  }
}

module.exports = QuestSystem
