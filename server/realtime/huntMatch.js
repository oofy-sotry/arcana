// 파티 사냥 서버 권위 전투 진행 — 파티 전원 vs 몬스터 1마리씩 순차 인카운터.
// 클라이언트 순수 로직(DB/Electron 의존 없음)을 상대경로로 그대로 재사용.
const { calcDamage } = require('../../src/game/utils/formula')
const { getZone, getMonster, getDropTable } = require('../../src/game/data/monsters')

const REGULAR_ENCOUNTER_COUNT = 3 // 일반 몬스터 수 (+ 마지막에 구역 보스 1마리 확정 추가)

// members: [{ userId, username, pet: {name,attribute,level,hp,attack,defense,speed} }]
// options: { broadcast(event), onEnd(summary), turnDelayMs = 800 }
// 반환: { removeMember(userId) } — 연결 끊김 시 호출하는 컨트롤러
function runHunt(zoneId, members, { broadcast, onEnd, turnDelayMs = 800 }) {
  const zone = getZone(zoneId)
  if (!zone) {
    const summary = { type: 'hunt:end', reason: 'invalid_zone', cleared: 0, total: 0 }
    broadcast(summary)
    onEnd(summary)
    return { removeMember() {} }
  }

  const state = new Map(members.map(m => [m.userId, { ...m, hp: m.pet.hp || 50, alive: true }]))
  let ended = false
  let timer = null
  let monster = null
  let monsterIndex = -1
  let killedCount = 0

  const monsterQueue = []
  for (let i = 0; i < REGULAR_ENCOUNTER_COUNT; i++) {
    monsterQueue.push(zone.monsterIds[i % zone.monsterIds.length])
  }
  monsterQueue.push(zone.bossId)

  const aliveMembers = () => [...state.values()].filter(m => m.alive)

  function finish(reason) {
    if (ended) return
    ended = true
    if (timer) clearTimeout(timer)
    const summary = { type: 'hunt:end', reason, cleared: killedCount, total: monsterQueue.length }
    broadcast(summary)
    onEnd(summary)
  }

  function rollCoins(monsterDef) {
    const { min, max } = monsterDef.coins
    return min + Math.floor(Math.random() * (max - min + 1))
  }

  function rewardForKill(monsterDef) {
    const rewards = {}
    for (const m of aliveMembers()) {
      const drops = []
      for (const entry of getDropTable(monsterDef.id)) {
        if (Math.random() < entry.rate) drops.push({ itemId: entry.itemId, quantity: entry.quantity })
      }
      rewards[m.userId] = { exp: monsterDef.exp, coins: rollCoins(monsterDef), drops }
    }
    return rewards
  }

  function spawnNextMonster() {
    monsterIndex++
    if (monsterIndex >= monsterQueue.length) { finish('cleared'); return }
    const def = getMonster(monsterQueue[monsterIndex])
    if (!def) { spawnNextMonster(); return } // 데이터 누락 시 다음으로
    monster = { ...def, currentHp: def.hp }
    broadcast({
      type: 'encounter:start', monsterId: monster.id, monsterName: monster.name,
      index: monsterIndex, total: monsterQueue.length, isBoss: !!monster.isBoss,
    })
    timer = setTimeout(step, turnDelayMs)
  }

  function step() {
    if (ended) return
    if (aliveMembers().length === 0) { finish('wiped'); return }

    const ordered = aliveMembers().sort((a, b) => (b.pet.speed || 10) - (a.pet.speed || 10))
    for (const attacker of ordered) {
      if (monster.currentHp <= 0) break
      const result = calcDamage({
        attack: attacker.pet.attack, defense: monster.defense, skillLevel: 1,
        attackerAttr: attacker.pet.attribute, defenderAttr: monster.attribute,
      })
      monster.currentHp = Math.max(0, monster.currentHp - result.damage)
      broadcast({
        type: 'hunt:turn', actor: attacker.userId, target: 'monster',
        damage: result.damage, isCrit: result.isCrit, monsterHp: monster.currentHp,
      })
    }

    if (monster.currentHp <= 0) {
      killedCount++
      broadcast({ type: 'monster:defeated', monsterId: monster.id, rewards: rewardForKill(monster) })
      spawnNextMonster()
      return
    }

    const survivors = aliveMembers()
    const target = survivors[Math.floor(Math.random() * survivors.length)]
    const result = calcDamage({
      attack: monster.attack, defense: target.pet.defense, skillLevel: 1,
      attackerAttr: monster.attribute, defenderAttr: target.pet.attribute,
    })
    target.hp = Math.max(0, target.hp - result.damage)
    if (target.hp <= 0) target.alive = false
    broadcast({
      type: 'hunt:turn', actor: 'monster', target: target.userId,
      damage: result.damage, isCrit: result.isCrit, targetHp: target.hp, targetAlive: target.alive,
    })

    timer = setTimeout(step, turnDelayMs)
  }

  broadcast({ type: 'party:formed', members: members.map(m => ({ userId: m.userId, username: m.username })) })
  spawnNextMonster()

  return {
    removeMember(userId) {
      const m = state.get(userId)
      if (m) m.alive = false
      if (aliveMembers().length === 0) finish('wiped')
    },
  }
}

module.exports = { runHunt, REGULAR_ENCOUNTER_COUNT }
