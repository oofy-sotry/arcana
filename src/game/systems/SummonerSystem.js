const db = require('../../db/database')

const T1_POOL = [
  { species: 'Steamar',    attribute: 'fire',    attribute2: 'water'   },
  { species: 'Magmaron',   attribute: 'fire',    attribute2: 'ice'     },
  { species: 'Helflaron',  attribute: 'dark',    attribute2: 'fire'    },
  { species: 'Stormtidex', attribute: 'thunder', attribute2: 'water'   },
  { species: 'Acidrax',    attribute: 'poison',  attribute2: 'water'   },
  { species: 'Sandorrex',  attribute: 'earth',   attribute2: 'wind'    },
  { species: 'Venomstrix', attribute: 'poison',  attribute2: 'wind'    },
  { species: 'Metalrox',   attribute: 'earth',   attribute2: 'thunder' },
  { species: 'Frostoltex', attribute: 'ice',     attribute2: 'thunder' },
  { species: 'Glacidrax',  attribute: 'dragon',  attribute2: 'ice'     },
  { species: 'Sacrotox',   attribute: 'light',   attribute2: 'poison'  },
  { species: 'Venomrex',   attribute: 'dragon',  attribute2: 'poison'  },
  { species: 'Shadowrex',  attribute: 'dark',    attribute2: 'dragon'  },
  { species: 'Chaosrex',   attribute: 'dark',    attribute2: 'light'   },
]

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

    // 3% T1 혼합종, 97% 기본 속성
    const isHybrid = Math.random() < 0.03
    let pet

    if (isHybrid) {
      const t1 = T1_POOL[Math.floor(Math.random() * T1_POOL.length)]
      const CHARACTERS = require('../data/characters')
      const charData   = CHARACTERS[`${t1.species.toLowerCase()}_0`]
      const petName    = charData?.name ?? `${t1.species} 에그`
      pet = this.Pet.createPet(petName, t1.attribute, t1.species)
      this.Pet.updatePet(pet.id, { attribute2: t1.attribute2, max_breeding: 2 })
      pet = this.Pet.getPet(pet.id)
    } else {
      const attr = BASIC_ATTRS[Math.floor(Math.random() * BASIC_ATTRS.length)]
      const CHARACTERS = require('../data/characters')
      const charData   = Object.values(CHARACTERS).find(
        c => c.attribute === attr && c.stage === 0 && !c.isHidden && !c.attribute2 && !c.species
      )
      const petName = charData?.name ?? `${ATTR_NAMES[attr]} 에그`
      pet = this.Pet.createPet(petName, attr)
    }

    db.run("INSERT OR IGNORE INTO one_time_events (event_key) VALUES ('free_gacha')")
    this.save()
    return { ok: true, pet, isHybrid }
  }
}

module.exports = SummonerSystem
