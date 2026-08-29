// 실시간 PvP 서버 권위(authoritative) 전투 진행.
// 클라이언트 순수 로직(DB/Electron 의존 없음)을 상대경로로 그대로 재사용 — 중복 구현 안 함.
const { calcDamage } = require('../../src/game/utils/formula')

const MAX_ROUNDS = 100

// side: { userId, username, pet: {name,attribute,level,hp,attack,defense,speed} }
// options.turnDelayMs: 턴 사이 딜레이(기본 800ms, 테스트에서 0으로 단축 가능)
// broadcast(event): 매 턴/종료 시 호출. onEnd(result): 종료 후 1회 호출.
function runMatch(a, b, { broadcast, onEnd, turnDelayMs = 800 }) {
  let hpA = a.pet.hp || 50
  let hpB = b.pet.hp || 50
  const log = []
  let round = 0

  function attack(attacker, defender, attackerHp, defenderHp) {
    const result = calcDamage({
      attack:       attacker.pet.attack,
      defense:      defender.pet.defense,
      skillLevel:   1,
      attackerAttr: attacker.pet.attribute,
      defenderAttr: defender.pet.attribute,
    })
    const newDefenderHp = Math.max(0, defenderHp - result.damage)
    const entry = {
      type:   'turn',
      actor:  attacker.userId,
      target: defender.userId,
      damage: result.damage,
      isCrit: result.isCrit,
      attHp:  attackerHp,
      defHp:  newDefenderHp,
    }
    log.push(entry)
    broadcast(entry)
    return newDefenderHp
  }

  function finish() {
    const winner =
      hpA <= 0 && hpB <= 0 ? 'draw' :
      hpA <= 0             ? b.userId :
      hpB <= 0             ? a.userId :
      'draw' // 라운드 소진 시 무승부
    const result = { type: 'result', winner, log }
    broadcast(result)
    onEnd(result)
  }

  function step() {
    if (hpA <= 0 || hpB <= 0 || round >= MAX_ROUNDS) { finish(); return }
    round++

    const aFirst = (a.pet.speed || 10) >= (b.pet.speed || 10)
    if (aFirst) {
      hpB = attack(a, b, hpA, hpB)
      if (hpB <= 0) { finish(); return }
      hpA = attack(b, a, hpB, hpA)
    } else {
      hpA = attack(b, a, hpB, hpA)
      if (hpA <= 0) { finish(); return }
      hpB = attack(a, b, hpA, hpB)
    }

    setTimeout(step, turnDelayMs)
  }

  step()
}

module.exports = { runMatch, MAX_ROUNDS }
