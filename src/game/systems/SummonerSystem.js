const db = require('../../db/database')

// 무료 소환 히든 풀 — 빛(루시나) · 어둠(노크티아) 2종
const FREE_GACHA_HIDDEN = ['light_0', 'dark_0']

const BASIC_ATTRS = ['fire','water','wind','earth','thunder','ice','poison','dragon','light','dark']

const ATTR_NAMES = {
  fire: '화염', water: '수류', wind: '바람', earth: '대지',
  thunder: '번개', ice: '빙결', poison: '독기', dragon: '용신',
  light: '성광', dark: '암흑',
}

class SummonerSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save
  }

  getSummoner() {
    return db.query('SELECT * FROM summoner LIMIT 1')[0] ?? null
  }

  createSummoner(name) {
    const trimmed = name?.trim()
    if (!trimmed) return { ok: false, error: '이름을 입력하세요' }
    if (trimmed.length > 12) return { ok: false, error: '이름은 12자 이하로 입력하세요' }
    db.run('INSERT INTO summoner (name, created_at) VALUES (?, ?)', [trimmed, Date.now()])
    this.save()
    return { ok: true, summoner: this.getSummoner() }
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
      const charKey  = FREE_GACHA_HIDDEN[Math.floor(Math.random() * FREE_GACHA_HIDDEN.length)]
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
