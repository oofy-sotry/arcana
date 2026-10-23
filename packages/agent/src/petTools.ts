// 펫 에이전트 tool — 게임 상태를 바꾸는 일은 전부 GameApi(기존 게임 시스템 함수)에 맡기고,
// 여기서는 실행 전 검증과 모델에 넘길 결과 요약만 한다
import type { Pet } from '@arcana/shared'
import type { ToolDefinition } from './tools'

export interface InventoryRow {
  item_id:  string
  quantity: number
  data:     { name: string; type: string; effect: string } | null
}

export interface Zone {
  id:          string
  name:        string
  attribute:   string
  minLevel:    number
  maxLevel:    number
  accessible:  boolean
  recommended: boolean
  edge:        number | null
}

export interface PartyInfo {
  members: Array<Pet & { slot: number }>
  synergy: unknown
}

/** desktop main이 기존 시스템(PetSystem·ItemSystem·HuntingSystem·PartySystem)으로 구현해서 넘긴다 */
export interface GameApi {
  getPets(): Pet[]
  getInventory(petId: number): InventoryRow[]
  useItem(petId: number, itemId: string): unknown
  getZones(petId: number): Zone[]
  startAutoHunt(petId: number, zoneId: string): { battles: Array<{ result: string }>; finalEnergy: number } | { error: string }
  getParty(): PartyInfo
}

const MAX_ZONES = 8

const petIdParam = { type: 'integer' as const, minimum: 1, description: '펫 id (get_pets 결과의 id)' }

export function createPetTools(game: GameApi): ToolDefinition[] {
  const findPet  = (petId: number) => game.getPets().find(p => p.id === petId)
  const checkPet = (petId: number) => (findPet(petId) ? null : `내 펫 중에 id ${petId}인 펫이 없습니다`)

  return [
    {
      name: 'get_pets',
      description: '내 펫 목록과 상태(레벨, 배고픔·행복·청결·에너지 0~100, 기절 여부)를 본다. 수치가 낮을수록 배고프거나 지친 상태',
      parameters: { type: 'object', properties: {}, required: [] },
      run: () => game.getPets().map(p => ({
        id:          p.id,
        name:        p.name,
        attribute:   p.attribute,
        level:       p.level,
        stage:       p.evolution_stage,
        fainted:     Number(p.is_fainted) === 1,
        hunger:      Math.round(p.conditions?.hunger ?? 0),
        happiness:   Math.round(p.conditions?.happiness ?? 0),
        cleanliness: Math.round(p.conditions?.cleanliness ?? 0),
        energy:      Math.round(p.conditions?.energy ?? 0),
      })),
    },
    {
      name: 'get_inventory',
      description: '펫의 가방 아이템 목록을 본다. effect가 hunger_restore면 먹이',
      parameters: { type: 'object', properties: { petId: petIdParam }, required: ['petId'] },
      check: ({ petId }) => checkPet(petId as number),
      run: ({ petId }) => game.getInventory(petId as number).map(row => ({
        itemId:   row.item_id,
        name:     row.data?.name ?? row.item_id,
        quantity: row.quantity,
        type:     row.data?.type ?? 'unknown',
        effect:   row.data?.effect ?? 'none',
      })),
    },
    {
      name: 'use_item',
      description: '가방의 소모품을 펫에게 사용한다 (먹이 주기, 씻기기 등). itemId는 get_inventory 결과의 itemId',
      parameters: {
        type: 'object',
        properties: { petId: petIdParam, itemId: { type: 'string', description: '아이템 id' } },
        required: ['petId', 'itemId'],
      },
      check: ({ petId, itemId }) => {
        const petError = checkPet(petId as number)
        if (petError) return petError
        const row = game.getInventory(petId as number).find(r => r.item_id === itemId && r.quantity > 0)
        if (!row) return `${itemId} 아이템을 가지고 있지 않습니다`
        if (row.data?.type !== 'consumable') return `${row.data?.name ?? itemId}은(는) 사용할 수 없는 아이템입니다`
        return null
      },
      run: ({ petId, itemId }) => game.useItem(petId as number, itemId as string),
    },
    {
      name: 'get_hunting_zones',
      description: `펫 레벨·속성에 맞는 추천 사냥터를 최대 ${MAX_ZONES}개 본다. edge가 1 이상이면 대체로 이긴다`,
      parameters: { type: 'object', properties: { petId: petIdParam }, required: ['petId'] },
      check: ({ petId }) => checkPet(petId as number),
      run: ({ petId }) => game.getZones(petId as number)
        .filter(z => z.accessible && z.recommended)
        .slice(0, MAX_ZONES)
        .map(z => ({
          zoneId:    z.id,
          name:      z.name,
          attribute: z.attribute,
          minLevel:  z.minLevel,
          maxLevel:  z.maxLevel,
          edge:      z.edge === null ? null : Math.round(z.edge * 10) / 10,
        })),
    },
    {
      name: 'start_auto_hunt',
      description: '펫을 사냥터에 보내 에너지가 떨어지거나 질 때까지 자동 사냥한다 (전투 1회당 에너지 30)',
      parameters: {
        type: 'object',
        properties: { petId: petIdParam, zoneId: { type: 'string', description: 'get_hunting_zones 결과의 zoneId' } },
        required: ['petId', 'zoneId'],
      },
      check: ({ petId, zoneId }) => {
        const pet = findPet(petId as number)
        if (!pet) return checkPet(petId as number)
        if (Number(pet.is_fainted) === 1) return `${pet.name}은(는) 기절해 있어 사냥할 수 없습니다`
        const zone = game.getZones(petId as number).find(z => z.id === zoneId)
        if (!zone) return `없는 사냥터입니다: ${zoneId}`
        if (!zone.accessible) return `${zone.name}에는 아직 들어갈 수 없습니다`
        return null
      },
      run: ({ petId, zoneId }) => {
        const res = game.startAutoHunt(petId as number, zoneId as string)
        if ('error' in res) return { error: res.error }
        return {
          fights:      res.battles.length,
          wins:        res.battles.filter(b => b.result === 'won').length,
          lost:        res.battles.some(b => b.result === 'lost'),
          finalEnergy: Math.round(res.finalEnergy),
        }
      },
    },
    {
      name: 'get_party',
      description: '현재 파티 구성과 속성 시너지를 본다',
      parameters: { type: 'object', properties: {}, required: [] },
      run: () => {
        const party = game.getParty()
        return {
          members: party.members.map(m => ({ slot: m.slot, id: m.id, name: m.name, level: m.level, attribute: m.attribute })),
          synergy: party.synergy,
        }
      },
    },
  ]
}
