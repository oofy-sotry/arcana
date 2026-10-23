// 고정 요청 세트의 라우팅 결과 보고 — 모델을 부르지 않고, 요청마다 어느 모델로 가는지와
// 넣는 tool·게임 상태 크기를 "라우팅 없이 전부 넣을 때"와 나란히 보여준다
// 실행: pnpm --filter @arcana/agent route-report (빌드 후)
const { loadAgentConfig, routeRequest, buildContext, createPetTools, toToolSpec } = require('../dist')
const requests = require('../test/fixtures/requests.json')

// 보고용 게임 상태 — 펫 3마리, 가방 아이템 몇 개
const pets = [
  { id: 1, name: '불꽃이', attribute: 'fire',  level: 12, is_fainted: 0, conditions: { hunger: 15, happiness: 70, cleanliness: 55, energy: 90 } },
  { id: 2, name: '물방울', attribute: 'water', level: 8,  is_fainted: 0, conditions: { hunger: 80, happiness: 60, cleanliness: 30, energy: 40 } },
  { id: 3, name: '돌돌이', attribute: 'earth', level: 15, is_fainted: 1, conditions: { hunger: 50, happiness: 40, cleanliness: 70, energy: 0 } },
]
const item = (item_id, name, quantity, effect) => ({ item_id, quantity, data: { name, type: 'consumable', effect } })
const inventory = [item('pet_food', '펫 사료', 3, 'hunger_restore'), item('pet_soap', '펫 비누', 1, 'clean_restore'), item('energy_potion', '에너지 물약', 2, 'energy_restore')]
const game = {
  getPets: () => pets, getInventory: () => inventory, useItem: () => ({}), getZones: () => [],
  startAutoHunt: () => ({ battles: [], finalEnergy: 0 }), getParty: () => ({ members: [], synergy: null }),
}

const config   = loadAgentConfig()
const allTools = createPetTools(game)
const specChars = names => JSON.stringify(allTools.filter(t => names.includes(t.name)).map(toToolSpec)).length
const allNames  = allTools.map(t => t.name)
const full      = { tools: allNames.length, chars: buildContext(game, { kind: 'tools', tools: allNames }, { maxPets: config.routing.contextMaxPets }).text.length + specChars(allNames) }

const rows = requests.map(({ message, expect }) => {
  const route = routeRequest(message, config)
  const ctx   = buildContext(game, route, { maxPets: config.routing.contextMaxPets })
  const chars = ctx.text.length + specChars(route.tools)
  return { message, expect, route, ctx, chars }
})

console.log(`| 요청 | 기대 | 경로 | 모델 | tool | 상태(부분) | 상태+tool 설명 글자 | 전부 넣을 때 대비 |`)
console.log('|---|---|---|---|---|---|---|---|')
for (const r of rows) {
  const model = config.models[r.route.modelName].model
  const saved = Math.round((1 - r.chars / full.chars) * 100)
  console.log(`| ${r.message} | ${r.expect} | ${r.route.kind}${r.route.kind === r.expect ? '' : ' ✗'} | ${model} | ${r.route.tools.length} | ${r.ctx.text.length}자(${r.ctx.parts.join('+')}) | ${r.chars} | -${saved}% |`)
}
const avg  = rows.reduce((s, r) => s + r.chars, 0) / rows.length
const hits = rows.filter(r => r.route.kind === r.expect).length
console.log(`\n라우팅 일치 ${hits}/${rows.length}, 잡담 모델로 간 요청 ${rows.filter(r => r.route.kind === 'chat').length}개`)
console.log(`라우팅 없이 전부 넣을 때 요청당 ${full.chars}자(tool ${full.tools}개) → 평균 ${Math.round(avg)}자 (-${Math.round((1 - avg / full.chars) * 100)}%)`)
console.log('※ 글자 수 기준 비교(모델 호출 없음). 실제 토큰·지연·비용 비교는 D5에서 측정')
