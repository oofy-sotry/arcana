class LevelSystem {
  constructor({ Pet, save, summonerSystem }) {
    this.Pet  = Pet
    this.save = save
    this.summonerSystem = summonerSystem || null
  }

  getExpRequired(level) {
    return Math.floor(Math.pow(level, 1.5) * 100)
  }

  // 성장 등급은 태어날 때 결정: 하(60%) 중(30%) 상(10%)
  // 현재 구현에서는 pet.growth_grade 컬럼 없이 id 해시로 결정 (재현 가능)
  calcStatGrowth(pet) {
    const hash       = pet.id % 10
    const multiplier = hash < 6 ? 1.0 : hash < 9 ? 1.5 : 2.0
    // 소환사 스탯: growth_bonus — 투자 포인트당 레벨업 증가량 +1%
    const growthBonus = this.summonerSystem?.getActiveStat('growth_bonus') || 0
    const bonusMult    = 1 + growthBonus * 0.01
    return {
      hp:      Math.ceil(5 * multiplier * bonusMult),
      mp:      Math.ceil(3 * multiplier * bonusMult),
      attack:  Math.ceil(2 * multiplier * bonusMult),
      defense: Math.ceil(1 * multiplier * bonusMult),
      speed:   Math.ceil(2 * multiplier * bonusMult),
    }
  }

  levelUp(pet, currentLevel) {
    const newLevel = currentLevel + 1
    const growth   = this.calcStatGrowth(pet)

    this.Pet.updatePet(pet.id, {
      hp:           pet.hp      + growth.hp,
      mp:           pet.mp      + growth.mp,
      attack:       pet.attack  + growth.attack,
      defense:      pet.defense + growth.defense,
      speed:        pet.speed   + growth.speed,
      skill_points: pet.skill_points + 1,
    })

    return newLevel
  }

  addExperience(pet, amount) {
    let { level, exp } = pet
    exp += amount

    while (exp >= this.getExpRequired(level)) {
      exp -= this.getExpRequired(level)
      const freshPet = this.Pet.getPet(pet.id) || pet
      level = this.levelUp(freshPet, level)
    }

    this.Pet.updatePet(pet.id, { level, exp })
    this.save()
    return { level, exp }
  }
}

module.exports = LevelSystem
