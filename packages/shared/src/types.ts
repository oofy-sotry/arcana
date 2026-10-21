// 클라이언트(main·renderer)와 AI 에이전트가 함께 쓰는 게임 데이터 타입
// 원본은 apps/desktop/src/db/migrations의 pets·pet_conditions 테이블과 @arcana/game-core/attributes

/** 기본 8속성 + 빛·어둠·전속성 (@arcana/game-core/attributes의 ATTRS_ALL) */
export type Attribute =
  | 'fire' | 'water' | 'wind' | 'earth' | 'thunder' | 'ice' | 'poison' | 'dragon'
  | 'light' | 'dark' | 'omni'

/** pet_conditions 테이블 — 0~100, 시간이 지나면 줄어든다 */
export interface PetConditions {
  pet_id:       number
  hunger:       number
  happiness:    number
  cleanliness:  number
  energy:       number
  last_updated: number
}

/** pet:get-all 응답의 한 항목 — pets 테이블 행 + conditions. SQLite라 불리언은 0/1 */
export interface Pet {
  id:              number
  uuid:            string
  name:            string
  species:         string
  attribute:       Attribute
  evolution_stage: number
  level:           number
  exp:             number
  age_seconds:     number
  is_alive:        0 | 1
  is_hidden:       0 | 1
  born_at:         number
  last_active:     number
  hp:              number
  mp:              number
  cur_hp:          number | null
  cur_mp:          number | null
  attack:          number
  defense:         number
  speed:           number
  coins:           number
  skill_points:    number
  affinity:        number
  loyalty:         number
  max_breeding:    number
  used_breeding:   number
  faint_count:     number
  is_fainted:      0 | 1
  faint_decay_day:  string | null
  last_treated_day: string | null
  conditions:      PetConditions | null
}
