// AI 펫 에이전트에 넘길 GameApi (@arcana/agent petTools) — 기존 게임 시스템 함수만 호출하고
// 게임 상태를 바꾸는 새 로직은 두지 않는다. 처리 순서는 ipcRouter의 같은 기능 핸들러와 맞춘다
function createAgentGameApi({ petSystem, itemSystem, skillSystem, huntingSystem, partySystem }) {
  const findPet = petId => petSystem.getAll().find(p => p.id === petId)

  return {
    getPets: () => petSystem.getAll(),

    getInventory: petId => itemSystem.getInventory(petId),

    // item:use 핸들러와 같은 처리 — 어둠 진화면 새 단계 스킬 해금
    useItem: (petId, itemId) => {
      const pet = findPet(petId)
      if (!pet) return { ok: false, reason: 'not_found' }
      const result = itemSystem.useItem(pet, itemId)
      if (result.ok && result.effect === 'dark_evolve') {
        const freshPet = findPet(petId)
        if (freshPet) skillSystem.unlockForStage(freshPet)
      }
      return result
    },

    getZones: petId => huntingSystem.getZones(findPet(petId) ?? null),

    startAutoHunt: (petId, zoneId) => {
      const pet = findPet(petId)
      if (!pet) return { error: 'not_found' }
      return huntingSystem.startAutoHunt(pet, zoneId)
    },

    getParty: () => partySystem.getParty(),
  }
}

module.exports = { createAgentGameApi }
