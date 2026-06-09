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

function renderPetList() {
  const container = document.getElementById('tab-pets')
  container.innerHTML = ''

  if (allPets.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:80px">
        <p style="color:#aaa; margin-bottom:16px">에레멘탈이 없습니다.</p>
        <button id="btn-create" style="padding:10px 24px; background:#e94560; border:none; color:#fff; border-radius:6px; cursor:pointer; font-size:14px">
          새 에레멘탈 소환
        </button>
      </div>`
    document.getElementById('btn-create').addEventListener('click', showCreateForm)
    return
  }

  allPets.forEach(pet => {
    const card = new PetCard(pet, onSelectPet)
    container.appendChild(card.render())
  })
}

function showCreateForm() {
  const container = document.getElementById('tab-pets')
  container.innerHTML = `
    <div style="max-width:320px; margin:60px auto">
      <h2 style="margin-bottom:20px; color:#e94560">새 에레멘탈 소환</h2>
      <input id="pet-name" placeholder="이름" style="width:100%; padding:8px; margin-bottom:10px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px" />
      <select id="pet-attr" style="width:100%; padding:8px; margin-bottom:16px; background:#16213e; border:1px solid #0f3460; color:#eee; border-radius:4px">
        <option value="fire">불🔥</option>
        <option value="water">물💧</option>
        <option value="wind">바람🌪️</option>
        <option value="earth">땅🌍</option>
        <option value="thunder">번개⚡</option>
        <option value="ice">얼음❄️</option>
        <option value="poison">독☠️</option>
        <option value="dragon">드래곤🐉</option>
      </select>
      <button id="btn-confirm" style="width:100%; padding:10px; background:#e94560; border:none; color:#fff; border-radius:6px; cursor:pointer">소환</button>
    </div>`

  document.getElementById('btn-confirm').addEventListener('click', async () => {
    const name      = document.getElementById('pet-name').value.trim()
    const attribute = document.getElementById('pet-attr').value
    if (!name) return
    await window.arcana.pet.create({ name, attribute })
    allPets = await window.arcana.pet.getAll()
    renderPetList()
  })
}

function onSelectPet(petId) {
  selectedPetId = petId
}

document.addEventListener('DOMContentLoaded', init)
