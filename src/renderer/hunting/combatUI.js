class CombatUI {
  constructor() {
    this.petHpBar   = document.getElementById('pet-hp-bar')
    this.petHpText  = document.getElementById('pet-hp-text')
    this.monHpBar   = document.getElementById('mon-hp-bar')
    this.monHpText  = document.getElementById('mon-hp-text')
    this.currentPetMaxHp = 100
    this.currentMonMaxHp = 100
  }
}

window._combatUI = null
