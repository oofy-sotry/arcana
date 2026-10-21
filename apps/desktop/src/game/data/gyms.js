// 체육관 — 지역마다 하나, 안에 속성별 관장, 관장마다 그 지역 tier별 도전(앞 단계 배지가 있어야 다음 단계)
// 관장 팀: 그 속성·tier의 일반 몬스터 2마리 + 보스. 이기면 배지와 상금
const ATTR_NAMES = {
  fire: '불꽃', water: '물결', wind: '바람', earth: '대지',
  thunder: '번개', ice: '얼음', poison: '독', dragon: '용',
}

const LEADER_NAMES = {
  fire: '이그나', water: '마린', wind: '실프', earth: '테라',
  thunder: '볼트', ice: '프로스', poison: '베노', dragon: '드라코',
}

function makeLeaders(gymId, attrs) {
  return attrs.map(attr => ({
    id:        `${gymId}_${attr}`,
    attribute: attr,
    name:      `${ATTR_NAMES[attr]} 관장 ${LEADER_NAMES[attr]}`,
    badgeName: `${ATTR_NAMES[attr]} 배지`,
  }))
}

const GYMS = [
  {
    id:     'gym1',
    name:   '에레멘탈 마을 체육관',
    tiers:  [1, 2, 3],   // 이 지역(숲 1~3구역) tier
    leaders: makeLeaders('gym1', ['fire', 'water', 'wind', 'earth', 'thunder', 'ice', 'poison', 'dragon']),
  },
]

function getLeader(leaderId) {
  for (const gym of GYMS) {
    const leader = gym.leaders.find(l => l.id === leaderId)
    if (leader) return { gym, leader }
  }
  return null
}

// 관장 팀 — 그 속성·tier 몬스터 id 목록 (마지막이 에이스)
function getTeam(leader, tier) {
  return [`${leader.attribute}_${tier}_a`, `${leader.attribute}_${tier}_b`, `${leader.attribute}_${tier}_boss`]
}

module.exports = { GYMS, getLeader, getTeam }
