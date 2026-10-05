const { GYMS, getLeader } = require('../data/gyms')

const BADGE_BONUS = 0.02 // 배지 1단계마다 그 속성 펫 공격·방어 +2% (원작 배지 능력치 보정)

// 체육관 — 관장별 tier 도전 가능 여부, 배지 지급, 배지 보정
class GymSystem {
  constructor({ save }) {
    this.save = save
  }

  getBadges() {
    const db = require('../../db/database')
    return db.query('SELECT * FROM badges ORDER BY earned_at')
  }

  hasBadge(leaderId, tier) {
    return this.getBadges().some(b => b.leader_id === leaderId && b.tier === tier)
  }

  // 앞 단계 배지가 있어야 다음 단계 도전 가능
  canChallenge(leaderId, tier) {
    const found = getLeader(leaderId)
    if (!found) return { ok: false, error: '없는 관장입니다' }
    const { gym } = found
    if (!gym.tiers.includes(tier)) return { ok: false, error: '이 체육관에 없는 단계입니다' }
    if (tier !== gym.tiers[0] && !this.hasBadge(leaderId, tier - 1)) {
      return { ok: false, error: `${tier - 1}단계 배지를 먼저 받아야 합니다` }
    }
    return { ok: true, ...found }
  }

  // 체육관 화면용 — 관장마다 단계별 획득·도전 가능 여부, 권장 레벨
  getGymView(gymId) {
    const gym = GYMS.find(g => g.id === gymId)
    if (!gym) return null
    const badges = this.getBadges()
    const has = (leaderId, tier) => badges.some(b => b.leader_id === leaderId && b.tier === tier)
    return {
      id: gym.id, name: gym.name,
      leaders: gym.leaders.map(l => ({
        ...l,
        tiers: gym.tiers.map((t, i) => ({
          tier: t,
          earned: has(l.id, t),
          open: i === 0 || has(l.id, gym.tiers[i - 1]),
          level: `${(t - 1) * 10 + 1}~${t * 10}`,
        })),
      })),
    }
  }

  awardBadge(leaderId, tier) {
    const found = getLeader(leaderId)
    if (!found) return null
    const { leader } = found
    const badgeId = `${leaderId}_t${tier}`
    const isNew   = !this.hasBadge(leaderId, tier)
    if (isNew) {
      const db = require('../../db/database')
      db.run(
        'INSERT INTO badges (badge_id, leader_id, attribute, tier, earned_at) VALUES (?, ?, ?, ?, ?)',
        [badgeId, leaderId, leader.attribute, tier, Date.now()]
      )
      this.save?.()
    }
    return { badgeId, name: `${leader.badgeName} ${tier}단계`, isNew }
  }

  // 그 속성 배지 단계 수만큼 공격·방어 배율
  getBadgeBonus(attribute) {
    const count = this.getBadges().filter(b => b.attribute === attribute).length
    return 1 + BADGE_BONUS * count
  }
}

module.exports = GymSystem
