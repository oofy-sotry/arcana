// 컨텍스트 선택 — 게임 전체 상태 대신 라우팅 결과에 필요한 부분만 프롬프트에 넣는다.
// 값은 펫 tool의 run()을 그대로 써서 tool 결과와 같은 기준으로 요약한다 (조회만, 상태는 바꾸지 않음)
import { createPetTools, type GameApi } from './petTools'
import type { RouteDecision } from './router'

export interface GameContext {
  text:  string
  /** 넣은 부분 — 로그용 (pets_brief | pets | inventory) */
  parts: string[]
}

interface PetSummary {
  id: number; name: string; attribute: string; level: number; fainted: boolean
  hunger: number; happiness: number; cleanliness: number; energy: number
}

interface ItemSummary { itemId: string; name: string; quantity: number; effect: string }

const INVENTORY_TOOLS = ['get_inventory', 'use_item']

export function buildContext(game: GameApi, route: Pick<RouteDecision, 'kind' | 'tools'>, { maxPets }: { maxPets: number }): GameContext {
  const tools   = createPetTools(game)
  const runTool = (name: string, args = {}) => tools.find(t => t.name === name)!.run(args)
  const pets    = runTool('get_pets') as PetSummary[]
  const shown   = pets.slice(0, maxPets)
  const more    = pets.length > maxPets ? `외 ${pets.length - maxPets}마리` : ''

  if (route.kind === 'chat') {
    const names = shown.map(p => `${p.name}(Lv${p.level})`)
    if (more) names.push(more)
    return { text: `내 펫: ${names.length ? names.join(', ') : '없음'}`, parts: ['pets_brief'] }
  }

  const lines = ['[현재 게임 상태 — 아래 값은 방금 조회한 것이므로 다시 조회하지 않아도 된다]']
  if (shown.length === 0) lines.push('펫 없음')
  for (const p of shown) {
    lines.push(`id ${p.id} ${p.name} Lv${p.level} ${p.attribute} 배고픔 ${p.hunger} 행복 ${p.happiness} 청결 ${p.cleanliness} 에너지 ${p.energy}${p.fainted ? ' 기절' : ''}`)
  }
  if (more) lines.push(more)
  const parts = ['pets']

  if (route.tools.some(t => INVENTORY_TOOLS.includes(t))) {
    for (const p of shown) {
      const items = runTool('get_inventory', { petId: p.id }) as ItemSummary[]
      const list  = items.map(i => `${i.itemId} ${i.name} x${i.quantity} ${i.effect}`).join(', ')
      lines.push(`id ${p.id} 가방: ${list || '비어 있음'}`)
    }
    parts.push('inventory')
  }

  return { text: lines.join('\n'), parts }
}
