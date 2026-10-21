// 체육관 (에레멘탈 마을) — 실내 15×11, 속성별 관장 8명
// 타일: 4=벽 5=출입문 11=실내 바닥
const { GYMS } = require('../gyms')

const W = 15, H = 11

const TILES = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ...Array.from({ length: 9 }, () => [4, ...Array(13).fill(11), 4]),
  [4, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4],
]

const COLORS = {
  fire: '#ff7043', water: '#42a5f5', wind: '#9ccc65', earth: '#a1887f',
  thunder: '#ffee58', ice: '#80deea', poison: '#ab47bc', dragon: '#7e57c2',
}
const SPOTS = [[2, 2], [5, 2], [9, 2], [12, 2], [2, 5], [5, 5], [9, 5], [12, 5]]

const NPCS = GYMS[0].leaders.map((leader, i) => ({
  id:       `${leader.id}_npc`,
  name:     leader.name,
  tile_x:   SPOTS[i][0], tile_y: SPOTS[i][1],
  color:    COLORS[leader.attribute],
  dialog:   [`나는 ${leader.name}. ${leader.badgeName}를 원한다면 실력을 보여 봐라!`],
  service:  'gym',
  leaderId: leader.id,
}))

const EXITS = [
  { tile_x: 7, tile_y: 10, targetMap: 'town', targetX: 4, targetY: 8, dir: 'south' },
]

module.exports = {
  id: 'gym1', name: '체육관',
  width: W, height: H,
  tiles: TILES, npcs: NPCS, exits: EXITS,
  startX: 7, startY: 9,
}
