if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET 미설정 — 개발용 기본값 사용 중. 프로덕션 배포 전 반드시 환경변수를 설정하세요.')
}

module.exports = {
  PORT:       process.env.PORT       || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'arcana-dev-secret-change-in-prod',
  JWT_EXPIRY: '30d',
}
