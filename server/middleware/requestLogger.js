// 요청 1건당 한 줄 로그: 시각 메서드 경로 상태코드 응답시간 [유저]
// node --test 실행 중(NODE_TEST_CONTEXT)에는 테스트 출력이 묻히지 않게 생략
function requestLogger(req, res, next) {
  if (process.env.NODE_TEST_CONTEXT) return next()
  const start = Date.now()
  res.on('finish', () => {
    const user = req.user ? ` user=${req.user.username}` : ''
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms ip=${req.ip}${user}`
    if (res.statusCode >= 500) console.error(line)
    else console.log(line)
  })
  next()
}

module.exports = requestLogger
