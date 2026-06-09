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
}

window._combatUI = null
