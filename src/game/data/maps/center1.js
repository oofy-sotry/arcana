// 회복소 (에레멘탈 마을) — 실내 11×8
// 타일: 4=벽 5=출입문 11=실내 바닥 12=카운터
const W = 11, H = 8

const TILES = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4,11,12,12,12,12,12,12,12,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4],
]

const NPCS = [
  {
    id: 'center1_nurse',
    name: '회복소 간호사',
    tile_x: 5, tile_y: 2,
    color: '#f48fb1',
    dialog: ['어서 오세요, 회복소입니다. 에레멘탈들을 쉬게 해 드릴까요?'],
    service: 'heal',
  },
]

const EXITS = [
  { tile_x: 5, tile_y: 7, targetMap: 'town', targetX: 4, targetY: 6, dir: 'south' },
]

module.exports = {
  id: 'center1', name: '회복소',
  width: W, height: H,
  tiles: TILES, npcs: NPCS, exits: EXITS,
  startX: 5, startY: 6,
}
