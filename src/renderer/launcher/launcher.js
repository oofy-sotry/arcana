let allPets       = []
let selectedPetId = null

async function init() {
  setupTabs()
  document.getElementById('btn-hunting').addEventListener('click', () => window.arcana.hunting.open())
  allPets = await window.arcana.pet.getAll()
  renderPetList()
}

function setupTabs() {
  document.querySelectorAll('nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active')
      const tab = btn.dataset.tab
      if (tab === 'breeding') renderBreedingTab()
      if (tab === 'gacha')    renderGachaTab()
      if (tab === 'party')    renderPartyTab()
      if (tab === 'quest')    renderQuestTab()
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

async function onSelectPet(petId) {
  selectedPetId = petId
  const pet     = allPets.find(p => p.id === petId)
  if (!pet) return

  const [skills, inventory] = await Promise.all([
    window.arcana.skill.get({ petId }),
    window.arcana.item.getInventory({ petId }),
  ])

  document.getElementById('tab-stats').innerHTML  = ''
  document.getElementById('tab-skills').innerHTML = ''
  document.getElementById('tab-items').innerHTML  = ''

  document.getElementById('tab-stats').appendChild(new StatPanel(pet).render())
  document.getElementById('tab-skills').appendChild(
    new SkillTree(pet, skills).render(async skillId => {
      await window.arcana.skill.upgrade({ petId, skillId })
      allPets = await window.arcana.pet.getAll()
      onSelectPet(petId)
    })
  )
  document.getElementById('tab-items').appendChild(
    new ItemPanel(pet, inventory).render(async itemId => {
      await window.arcana.item.use({ petId, itemId })
      allPets = await window.arcana.pet.getAll()
      onSelectPet(petId)
    })
  )
}

function renderBreedingTab() {
  const container = document.getElementById('tab-breeding')
  container.innerHTML = ''
  container.appendChild(
    new BreedingPanel(allPets).render(async () => {
      allPets = await window.arcana.pet.getAll()
      renderBreedingTab()
    })
  )
}

function renderGachaTab() {
  const container = document.getElementById('tab-gacha')
  container.innerHTML = ''
  container.appendChild(
    new GachaPanel(allPets).render(async () => {
      allPets = await window.arcana.pet.getAll()
      renderGachaTab()
    })
  )
}

async function renderPartyTab() {
  const container = document.getElementById('tab-party')
  container.innerHTML = '<span style="color:#aaa; font-size:13px">로딩 중...</span>'
  const party = await window.arcana.party.get()
  renderPartyTabWith(container, party)
}

function renderPartyTabWith(container, party) {
  container.innerHTML = ''
  container.appendChild(
    new PartyPanel(allPets, party).render(updatedParty => renderPartyTabWith(container, updatedParty))
  )
}

async function renderQuestTab() {
  const container = document.getElementById('tab-quest')
  container.innerHTML = '<span style="color:#aaa; font-size:13px">로딩 중...</span>'
  const [quests, factionRep, freshPets] = await Promise.all([
    window.arcana.quest.getAll(),
    window.arcana.quest.factionRep(),
    window.arcana.pet.getAll(),
  ])
  allPets = freshPets
  container.innerHTML = ''
  container.appendChild(
    new QuestPanel(quests, factionRep, allPets).render(async (questId, petId) => {
      const result = await window.arcana.quest.claim({ questId, petId })
      if (result.ok) {
        allPets = await window.arcana.pet.getAll()
        renderQuestTab()
      } else {
        alert(`수령 실패: ${result.reason}`)
      }
    })
  )
}

document.addEventListener('DOMContentLoaded', init)
