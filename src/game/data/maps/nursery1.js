// 육성소 (에레멘탈 마을) — 실내 11×8, 육성소 직원에게 교배를 맡긴다
// 타일: 4=벽 5=출입문 11=실내 바닥 12=카운터
const W = 11, H = 8

const TILES = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4,11,11,11,12,12,12,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4,11,11,11,11,11,11,11,11,11, 4],
  [4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4],
]

const NPCS = [
  {
    id: 'nursery1_keeper',
    name: '육성소 직원',
    tile_x: 5, tile_y: 2,
    color: '#aed581',
    dialog: ['육성소에 어서 오세요. 두 에레멘탈을 맡기시면 새 생명을 함께 키워 드려요.'],
    service: 'breed',
  },
]

const EXITS = [
  { tile_x: 5, tile_y: 7, targetMap: 'town', targetX: 14, targetY: 8, dir: 'south' },
]

module.exports = {
  id: 'nursery1', name: '육성소',
  width: W, height: H,
  tiles: TILES, npcs: NPCS, exits: EXITS,
  startX: 5, startY: 6,
}
