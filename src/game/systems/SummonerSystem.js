const db = require('../../db/database')

// 무료 소환 히든 풀 — 빛(Luxis) · 어둠(Noctis) 2종. faction: 대응 세력 평판(rollFreeGacha 가중치 계산용)
const FREE_GACHA_HIDDEN = [
  { key: 'light_0', faction: 'luxis' },
  { key: 'dark_0',  faction: 'noctis' },
]

const BASIC_ATTRS = ['fire','water','wind','earth','thunder','ice','poison','dragon','light','dark']

const ATTR_NAMES = {
  fire: '화염', water: '수류', wind: '바람', earth: '대지',
  thunder: '번개', ice: '빙결', poison: '독기', dragon: '용신',
  light: '성광', dark: '암흑',
}

// 성향별 기본 스탯 보너스
const PERSONALITY_BASE = {
  공격형: { battle_bonus: 3 },
  수호형: { growth_bonus: 3 },
  신비형: { hidden_bonus: 3 },
  전략형: { party_bonus:  3 },
  야생형: { speed_bonus:  3 },
  방해형: { debuff_bonus: 3 },
  지배형: { boss_bonus:   3 },
  탐험형: { explore_bonus: 3 },
}

// 레벨업 필요 경험치
const EXP_TABLE = Array.from({ length: 100 }, (_, i) => Math.floor(100 * Math.pow(1.4, i)))

class SummonerSystem {
  constructor({ Pet, save, factionSystem }) {
    this.Pet  = Pet
    this.save = save
    this.factionSystem = factionSystem || null
  }

  getSummoner() {
    return db.query('SELECT * FROM summoner LIMIT 1')[0] ?? null
  }

  createSummoner(name, appearance = 'male_a') {
    const trimmed = name?.trim()
    if (!trimmed) return { ok: false, error: '이름을 입력하세요' }
    if (trimmed.length > 12) return { ok: false, error: '이름은 12자 이하로 입력하세요' }
    db.run(
      'INSERT INTO summoner (name, appearance, created_at) VALUES (?, ?, ?)',
      [trimmed, appearance, Date.now()]
    )
    const summoner = this.getSummoner()
    db.run('INSERT OR IGNORE INTO map_state (summoner_id) VALUES (?)', [summoner.id])
    this.save()
    return { ok: true, summoner }
  }

  setPersonality(summonerId, personality) {
    if (!PERSONALITY_BASE[personality]) return { ok: false, error: '잘못된 성향입니다' }
    db.run('UPDATE summoner SET personality = ? WHERE id = ?', [personality, summonerId])
    // 성향 기본 스탯 초기화
    const base = PERSONALITY_BASE[personality]
    Object.entries(base).forEach(([key, val]) => {
      db.run(
        `INSERT INTO summoner_stats (summoner_id, stat_key, value)
         VALUES (?, ?, ?)
         ON CONFLICT(summoner_id, stat_key) DO UPDATE SET value = excluded.value`,
        [summonerId, key, val]
      )
    })
    this.save()
    return { ok: true }
  }

  getSummonerStats(summonerId) {
    const rows = db.query('SELECT stat_key, value FROM summoner_stats WHERE summoner_id = ?', [summonerId])
    const stats = {}
    rows.forEach(r => { stats[r.stat_key] = r.value })
    return stats
  }

  // 단일 플레이어 전제 — 현재 소환사의 스탯 포인트 값을 즉시 조회 (없으면 0)
  getActiveStat(statKey) {
    const summoner = this.getSummoner()
    if (!summoner) return 0
    const row = db.query(
      'SELECT value FROM summoner_stats WHERE summoner_id = ? AND stat_key = ?',
      [summoner.id, statKey]
    )[0]
    return row?.value ?? 0
  }

  investStat(summonerId, statKey) {
    const summoner = db.query('SELECT * FROM summoner WHERE id = ?', [summonerId])[0]
    if (!summoner || summoner.stat_points < 1) return { ok: false, error: '투자할 포인트가 없습니다' }
    db.run(
      `INSERT INTO summoner_stats (summoner_id, stat_key, value) VALUES (?, ?, 1)
       ON CONFLICT(summoner_id, stat_key) DO UPDATE SET value = value + 1`,
      [summonerId, statKey]
    )
    db.run('UPDATE summoner SET stat_points = stat_points - 1 WHERE id = ?', [summonerId])
    this.save()
    return { ok: true }
  }

  addExp(summonerId, amount) {
    const summoner = db.query('SELECT * FROM summoner WHERE id = ?', [summonerId])[0]
    if (!summoner) return { ok: false }
    let { level, exp } = summoner
    exp = Math.max(0, exp + amount)
    let leveled = false
    while (level < 100 && exp >= EXP_TABLE[level - 1]) {
      exp -= EXP_TABLE[level - 1]
      level++
      leveled = true
    }
    const pointsGained = leveled ? level - summoner.level : 0
    db.run(
      'UPDATE summoner SET level = ?, exp = ?, stat_points = stat_points + ? WHERE id = ?',
      [level, exp, pointsGained, summonerId]
    )
    this.save()
    return { ok: true, level, exp, leveled, pointsGained }
  }

  getMapState(summonerId) {
    return db.query('SELECT * FROM map_state WHERE summoner_id = ?', [summonerId])[0]
      ?? { map_id: 'town', tile_x: 7, tile_y: 7 }
  }

  saveMapState(summonerId, mapId, tileX, tileY) {
    db.run(
      `INSERT INTO map_state (summoner_id, map_id, tile_x, tile_y) VALUES (?, ?, ?, ?)
       ON CONFLICT(summoner_id) DO UPDATE SET map_id = excluded.map_id, tile_x = excluded.tile_x, tile_y = excluded.tile_y`,
      [summonerId, mapId, tileX, tileY]
    )
    this.save()
  }

  hasFreeGachaUsed() {
    return !!db.query("SELECT 1 FROM one_time_events WHERE event_key = 'free_gacha'")[0]
  }

  rollFreeGacha() {
    if (this.hasFreeGachaUsed()) return { ok: false, error: '이미 무료 소환을 사용했습니다' }

    // 3% 히든(빛/어둠 2종 랜덤), 97% 기본 속성
    const CHARACTERS = require('../data/characters')
    const isHidden   = Math.random() < 0.03
    let pet

    if (isHidden) {
      // 세력 평판 50+(normal 티어) 시 해당 속성 히든 출생확률 +5%p (FACTION_SYSTEM 설계)
      const weights = FREE_GACHA_HIDDEN.map(({ key, faction }) => ({
        key, weight: 50 + ((this.factionSystem?.getRep(faction) ?? 50) >= 50 ? 5 : 0),
      }))
      const total = weights.reduce((sum, w) => sum + w.weight, 0)
      let   roll  = Math.random() * total
      let   picked = weights[weights.length - 1].key
      for (const w of weights) { roll -= w.weight; if (roll <= 0) { picked = w.key; break } }

      const charKey  = picked
      const charData = CHARACTERS[charKey]
      pet = this.Pet.createPet(charData.name, charData.attribute)
      pet = this.Pet.getPet(pet.id)
    } else {
      const attr     = BASIC_ATTRS[Math.floor(Math.random() * BASIC_ATTRS.length)]
      const charData = Object.values(CHARACTERS).find(
        c => c.attribute === attr && c.stage === 0 && !c.isHidden && !c.attribute2 && !c.species
      )
      const petName  = charData?.name ?? `${ATTR_NAMES[attr]} 에그`
      pet = this.Pet.createPet(petName, attr)
    }

    db.run("INSERT OR IGNORE INTO one_time_events (event_key) VALUES ('free_gacha')")
    this.save()
    return { ok: true, pet, isHybrid: isHidden }
  }
}

module.exports = SummonerSystem
