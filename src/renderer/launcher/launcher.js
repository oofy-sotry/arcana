let allPets       = []
let selectedPetId = null

async function init() {
  setupTabs()
  allPets = await window.arcana.pet.getAll()
  renderPetList()
}

function setupTabs() {
  document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active')
    })
  })
}

document.addEventListener('DOMContentLoaded', init)
