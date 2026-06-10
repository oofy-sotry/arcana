const db = require('../../db/database')

// 세력 평판 효과 임계값
const REP_TIERS = [
  { min: 90, unlock: 'divine',   desc: '신성 속성 해금·최고 등급 세력 장비 접근' },
  { min: 70, unlock: 'advanced', desc: '고급 세력 구역 접근·희귀 퀘스트 해금' },
  { min: 50, unlock: 'normal',   desc: '중급 세력 구역 접근·세력 상점 이용' },
  { min: 30, unlock: 'basic',    desc: '기본 세력 구역 접근' },
]

// 균형 조건: |luxis_rep - noctis_rep| ≤ 20
const BALANCE_THRESHOLD = 20

// 영혼동화도 증가 원인별 수치
const SOUL_GAIN = {
  hybrid_pet:       5,    // 혼합속성 펫 보유당 (1회 카운트)
  hidden_evolution: 3,    // 히든 진화 달성
  hybrid_rescue:   10,    // 3장 혼합구원 선택
  time_tick:        0.01, // 시간 경과 (per tick)
}

class FactionSystem {
  constructor({ save }) {
    this.save = save
  }

  // ─── 평판 조회 ─────────────────────────────────────────────────────
  getRep(faction) {
    const row = db.query('SELECT reputation FROM faction_rep WHERE faction = ?', [faction])[0]
    return Number(row?.reputation ?? 50)
  }

  getAllRep() {
    const rows = db.query('SELECT faction, reputation FROM faction_rep')
    const result = { luxis: 50, noctis: 50 }
    for (const r of rows) result[r.faction] = Number(r.reputation)
    return result
  }

  // ─── 평판 변경 ─────────────────────────────────────────────────────
  changeRep(faction, delta) {
    if (!['luxis', 'noctis'].includes(faction)) return { ok: false, error: '알 수 없는 세력' }
    const current = this.getRep(faction)
    const next    = Math.max(0, Math.min(100, current + delta))
    db.run('UPDATE faction_rep SET reputation = ? WHERE faction = ?', [next, faction])
    this.save()

    const tier   = this._getTier(next)
    const isBalance = this._isBalance()
    return { ok: true, faction, prev: current, next, tier, isBalance }
  }

  // ─── 균형 상태 여부 ────────────────────────────────────────────────
  _isBalance() {
    const { luxis, noctis } = this.getAllRep()
    return Math.abs(luxis - noctis) <= BALANCE_THRESHOLD
  }

  // ─── 평판 임계 티어 ────────────────────────────────────────────────
  _getTier(rep) {
    for (const t of REP_TIERS) {
      if (rep >= t.min) return t.unlock
    }
    return 'none'
  }

  getTierInfo(faction) {
    const rep  = this.getRep(faction)
    const tier = this._getTier(rep)
    return { rep, tier, isBalance: this._isBalance() }
  }

  // ─── 구역 접근 가능 여부 ───────────────────────────────────────────
  // ZONES_DESIGN: light/dark 구역은 unlock 필드로 조건 정의
  canAccessZone(zoneUnlock) {
    if (!zoneUnlock || zoneUnlock === 'zone_access') return true
    if (zoneUnlock === 'story_ch5') {
      const val = this._worldState('story_chapter')
      return Number(val ?? 0) >= 5
    }
    const m = zoneUnlock.match(/^(luxis|noctis)_(\d+)$/)
    if (m) {
      const [, faction, minRepStr] = m
      return this.getRep(faction) >= Number(minRepStr)
    }
    return false
  }

  // ─── 영혼동화도 조회 ───────────────────────────────────────────────
  getSoulFusion() {
    return Number(this._worldState('soul_fusion') ?? 0)
  }

  // ─── 영혼동화도 증가 ───────────────────────────────────────────────
  gainSoulFusion(reason) {
    const gain    = SOUL_GAIN[reason] ?? 0
    if (gain <= 0) return { ok: false }
    const current = this.getSoulFusion()
    const next    = Math.min(100, current + gain)
    this._setWorldState('soul_fusion', next)
    this.save()
    return { ok: true, prev: current, next, gain, maxReached: next >= 100 }
  }

  // 혼합속성 펫 보유 시 영혼동화도 최초 1회 부여 (중복 방지)
  recordHybridPet(petId) {
    const key = `soul_hybrid_counted_${petId}`
    if (this._worldState(key)) return
    this._setWorldState(key, 1)
    this.gainSoulFusion('hybrid_pet')
  }

  // ─── 스토리 혼합구원 카운트 ────────────────────────────────────────
  getHybridRescueCount() {
    return Number(this._worldState('hybrid_rescue_count') ?? 0)
  }

  recordHybridRescue() {
    const cnt = this.getHybridRescueCount() + 1
    this._setWorldState('hybrid_rescue_count', cnt)
    this.gainSoulFusion('hybrid_rescue')
    return cnt
  }

  // ─── 히든 엔딩 조건 확인 ──────────────────────────────────────────
  checkHiddenEndingConditions() {
    const hybridRescue = this.getHybridRescueCount()
    const { luxis, noctis } = this.getAllRep()
    const soulFusion = this.getSoulFusion()
    const repBalance = Math.abs(luxis - noctis) <= BALANCE_THRESHOLD

    return {
      hybridRescue:      { value: hybridRescue, required: 5,    met: hybridRescue >= 5 },
      reputationBalance: { luxis, noctis, diff: Math.abs(luxis - noctis), met: repBalance },
      soulFusion:        { value: soulFusion,   required: 100,  met: soulFusion >= 100 },
      allMet:            hybridRescue >= 5 && repBalance && soulFusion >= 100,
    }
  }

  // ─── 스토리 챕터 진행 ─────────────────────────────────────────────
  getCurrentChapter() {
    return Number(this._worldState('story_chapter') ?? 0)
  }

  advanceChapter(chapter) {
    const current = this.getCurrentChapter()
    if (chapter <= current) return { ok: false, error: '이미 완료된 챕터' }
    this._setWorldState('story_chapter', chapter)
    this.save()
    return { ok: true, chapter }
  }

  // ─── 세력 아이템 사용 ─────────────────────────────────────────────
  useFactionItem(itemId) {
    const effects = {
      luxis_pendant:   { faction: 'luxis',  rep: 5 },
      noctis_pendant:  { faction: 'noctis', rep: 5 },
      neutral_crystal: { faction: 'both',   rep: 3 },
      soul_amplifier:  { soul: 20 },
    }
    const eff = effects[itemId]
    if (!eff) return { ok: false, error: '세력 효과가 없는 아이템' }

    if (eff.soul) {
      const cur  = this.getSoulFusion()
      const next = Math.min(100, cur + eff.soul)
      this._setWorldState('soul_fusion', next)
      this.save()
      return { ok: true, soul: { prev: cur, next } }
    }
    if (eff.faction === 'both') {
      const r1 = this.changeRep('luxis',  eff.rep)
      const r2 = this.changeRep('noctis', eff.rep)
      return { ok: true, luxis: r1, noctis: r2 }
    }
    return this.changeRep(eff.faction, eff.rep)
  }

  // ─── 내부 world_state 헬퍼 ────────────────────────────────────────
  _worldState(key) {
    const row = db.query('SELECT value FROM world_state WHERE key = ?', [key])[0]
    return row?.value ?? null
  }

  _setWorldState(key, value) {
    db.run(
      `INSERT INTO world_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, String(value)]
    )
  }
}

module.exports = FactionSystem
