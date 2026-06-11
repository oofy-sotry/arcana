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
      if (tab === 'breeding')  renderBreedingTab()
      if (tab === 'gacha')     renderGachaTab()
      if (tab === 'party')     renderPartyTab()
      if (tab === 'quest')     renderQuestTab()
      if (tab === 'online')    renderOnlineTab()
      if (tab === 'equipment') renderEquipmentTab()
      if (tab === 'faction')   renderFactionTab()
      if (tab === 'story')     renderStoryTab()
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
  if (!pet || Number(pet.is_alive) === 0) return

  const [skills, inventory] = await Promise.all([
    window.arcana.skill.get({ petId }),
    window.arcana.item.getInventory({ petId }),
  ])

  document.getElementById('tab-stats').innerHTML  = ''
  document.getElementById('tab-skills').innerHTML = ''
  document.getElementById('tab-items').innerHTML  = ''

  document.getElementById('tab-stats').appendChild(new StatPanel(pet, () => onEvolve(petId)).render())
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

async function onEvolve(petId) {
  const result = await window.arcana.evolution.attempt({ petId })
  if (result.reason === 'confirm_hidden') {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.7);
      display:flex; align-items:center; justify-content:center; z-index:9999`
    overlay.innerHTML = `
      <div style="background:#16213e; border:2px solid #e94560; border-radius:12px; padding:28px 32px; max-width:340px; text-align:center">
        <h3 style="color:#e94560; margin-bottom:12px">히든 진화</h3>
        <p style="color:#ddd; margin-bottom:8px">히든 진화 조건 달성!</p>
        <p style="color:#aaa; font-size:13px; margin-bottom:20px">진화석(evo_stone)을 1개 소비합니다.<br>히든 진화를 진행하시겠습니까?</p>
        <div style="display:flex; gap:12px; justify-content:center">
          <button id="btn-hidden-yes" style="padding:9px 22px; background:#e94560; border:none; color:#fff; border-radius:6px; cursor:pointer">히든 진화</button>
          ${result.canNormal ? `<button id="btn-hidden-normal" style="padding:9px 22px; background:#0f3460; border:1px solid #aaa; color:#ddd; border-radius:6px; cursor:pointer">일반 진화</button>` : ''}
          <button id="btn-hidden-no" style="padding:9px 22px; background:#1a1a2e; border:1px solid #555; color:#aaa; border-radius:6px; cursor:pointer">취소</button>
        </div>
      </div>`
    document.body.appendChild(overlay)

    const cleanup = () => document.body.removeChild(overlay)
    overlay.querySelector('#btn-hidden-yes').addEventListener('click', async () => {
      cleanup()
      const r = await window.arcana.evolution.attempt({ petId, forceType: 'hidden' })
      if (r.ok) { allPets = await window.arcana.pet.getAll(); onSelectPet(petId) }
      else alert(`진화 실패: ${r.reason}`)
    })
    overlay.querySelector('#btn-hidden-no').addEventListener('click', cleanup)
    if (result.canNormal) {
      overlay.querySelector('#btn-hidden-normal').addEventListener('click', async () => {
        cleanup()
        const r = await window.arcana.evolution.attempt({ petId, forceType: 'normal' })
        if (r.ok) { allPets = await window.arcana.pet.getAll(); onSelectPet(petId) }
        else alert(`진화 실패: ${r.reason}`)
      })
    }
    return
  }
  if (result.ok) {
    allPets = await window.arcana.pet.getAll()
    onSelectPet(petId)
  } else {
    alert(`진화 불가: ${result.reason}`)
  }
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

async function renderOnlineTab() {
  const container = document.getElementById('tab-online')
  container.innerHTML = '<span style="color:#aaa; font-size:13px">로딩 중...</span>'

  const [status, serverOnline, freshPets] = await Promise.all([
    window.arcana.online.status(),
    window.arcana.online.serverPing(),
    window.arcana.pet.getAll(),
  ])
  allPets = freshPets
  container.innerHTML = ''

  const panel = new OnlinePanel(status, serverOnline, allPets)
  container.appendChild(panel.render({
    refresh: renderOnlineTab,
    logout:  async () => {
      await window.arcana.online.logout()
      renderOnlineTab()
    },
  }))
}

async function renderEquipmentTab() {
  const container = document.getElementById('tab-equipment')
  container.innerHTML = '<span style="color:#aaa;font-size:13px">로딩 중...</span>'
  const pet = allPets.find(p => p.id === selectedPetId)

  if (!pet) {
    container.innerHTML = '<p style="color:#aaa;text-align:center;margin-top:40px">에레멘탈을 먼저 선택하세요</p>'
    return
  }

  const [inventory, equipped] = await Promise.all([
    window.arcana.equipment.getInventory({ petId: pet.id }),
    window.arcana.equipment.getEquipped({ petId: pet.id }),
  ])
  container.innerHTML = ''
  container.appendChild(
    new EquipmentPanel(pet, inventory, equipped).render(async () => {
      allPets = await window.arcana.pet.getAll()
      renderEquipmentTab()
    })
  )
}

async function renderFactionTab() {
  const container = document.getElementById('tab-faction')
  container.innerHTML = '<span style="color:#aaa;font-size:13px">로딩 중...</span>'

  const [repData, soulRes, hiddenCond, chapterRes] = await Promise.all([
    window.arcana.faction.getAll(),
    window.arcana.faction.soulFusion(),
    window.arcana.faction.hiddenEnding(),
    window.arcana.faction.chapter(),
  ])
  container.innerHTML = ''
  container.appendChild(
    new FactionPanel(repData, soulRes.value, hiddenCond, chapterRes.chapter).render()
  )
}

async function renderStoryTab() {
  const container = document.getElementById('tab-story')
  container.innerHTML = '<span style="color:#aaa;font-size:13px">로딩 중...</span>'

  const [repData, soulRes, hiddenCond, chapterRes] = await Promise.all([
    window.arcana.faction.getAll(),
    window.arcana.faction.soulFusion(),
    window.arcana.faction.hiddenEnding(),
    window.arcana.faction.chapter(),
  ])
  container.innerHTML = ''
  container.appendChild(
    new StoryPanel(chapterRes.chapter, repData, soulRes.value, hiddenCond).render(async () => {
      allPets = await window.arcana.pet.getAll()
      renderStoryTab()
    })
  )
}

document.addEventListener('DOMContentLoaded', init)
