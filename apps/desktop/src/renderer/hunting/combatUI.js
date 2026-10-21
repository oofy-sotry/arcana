class CombatUI {
  constructor() {
    this.petHpBar   = document.getElementById('pet-hp-bar')
    this.petHpText  = document.getElementById('pet-hp-text')
    this.monHpBar   = document.getElementById('mon-hp-bar')
    this.monHpText  = document.getElementById('mon-hp-text')
    this.currentPetMaxHp = 100
    this.currentMonMaxHp = 100
  }

  setPetHp(current, max) {
    this.currentPetMaxHp = max || this.currentPetMaxHp
    const pct = Math.max(0, Math.min(100, (current / this.currentPetMaxHp) * 100))
    this.petHpBar.style.width   = `${pct}%`
    this.petHpBar.style.background = pct > 50 ? '#2ecc71' : pct > 25 ? '#f39c12' : '#e74c3c'
    this.petHpText.textContent  = `${Math.max(0, current)}/${this.currentPetMaxHp}`
  }

  setMonsterHp(current, max) {
    this.currentMonMaxHp = max || this.currentMonMaxHp
    const pct = Math.max(0, Math.min(100, (current / this.currentMonMaxHp) * 100))
    this.monHpBar.style.width  = `${pct}%`
    this.monHpText.textContent = `${Math.max(0, current)}/${this.currentMonMaxHp}`
  }

  showMonster(monster) {
    this.setMonsterHp(monster.hp, monster.hp)
  }

  // 전투 결과(ipc 응답) 기반 HP 업데이트
  showResult(battleResult) {
    if (!battleResult) return
    const state = battleResult.state
    if (state?.petHp    != null) this.setPetHp(state.petHp, this.currentPetMaxHp)
    if (state?.monsterHp != null) this.setMonsterHp(state.monsterHp, this.currentMonMaxHp)
    if (battleResult.result === 'won')  this.setMonsterHp(0, this.currentMonMaxHp)
    if (battleResult.result === 'lost') this.setPetHp(0, this.currentPetMaxHp)
  }

  // 전투 턴 로그를 한 턴씩 재생 — HP 바를 턴마다 깎고 onTurn(entry)로 스프라이트 연출 연결
  async playBattle(battleResult, { onTurn } = {}) {
    if (!battleResult) return
    const log      = battleResult.log || []
    const petMax   = battleResult.petMaxHp     || this.currentPetMaxHp
    const monMax   = battleResult.monsterMaxHp || this.currentMonMaxHp
    let petHp = petMax
    let monHp = monMax
    this.setPetHp(petHp, petMax)
    this.setMonsterHp(monHp, monMax)

    const interval = Math.min(350, 4000 / Math.max(1, log.length))
    for (const entry of log) {
      await new Promise(r => setTimeout(r, interval))
      if (entry.actor === 'pet') {
        monHp -= entry.damage || 0
      } else {
        petHp -= entry.damage || 0
        monHp -= entry.counter || 0  // 패시브 반격
      }
      this.setPetHp(Math.round(petHp), petMax)
      this.setMonsterHp(Math.round(monHp), monMax)
      if (onTurn) onTurn(entry)
    }

    // 로그에 없는 지속 피해 등으로 어긋난 마지막 HP를 결과에 맞춤
    if (battleResult.result === 'won')  this.setMonsterHp(0, monMax)
    if (battleResult.result === 'lost') this.setPetHp(0, petMax)
  }
}

window._combatUI = null
