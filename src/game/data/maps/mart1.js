// 상점 (에레멘탈 마을) — 실내 11×8
// 타일: 4=벽 5=출입문 11=실내 바닥 12=카운터
const W = 11, H = 8

const TILES = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4,12,12,12,12,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4],
]

const NPCS = [
  {
    id: 'mart1_clerk',
    name: '상점 점원',
    tile_x: 2, tile_y: 2,
    color: '#4fc3f7',
    dialog: ['어서 오세요! 무엇을 도와드릴까요?'],
    service: 'shop',
  },
]

const EXITS = [
  { tile_x: 5, tile_y: 7, targetMap: 'town', targetX: 14, targetY: 6, dir: 'south' },
]

module.exports = {
  id: 'mart1', name: '상점',
  width: W, height: H,
  tiles: TILES, npcs: NPCS, exits: EXITS,
  startX: 5, startY: 6,
}
