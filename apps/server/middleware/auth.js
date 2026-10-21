const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config')

// REST 미들웨어와 WS 인증 핸드셰이크(realtime/socket.js)가 공통으로 쓰는 검증 함수.
// 유효하면 { user } 반환, 아니면 { error: 'token_expired' | 'invalid_token' } 반환.
function verifyToken(token) {
  if (!token) return { error: 'unauthorized' }
  try {
    return { user: jwt.verify(token, JWT_SECRET) }
  } catch (err) {
    return { error: err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token' }
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  const result = verifyToken(token)
  if (result.error) return res.status(401).json({ error: result.error })
  req.user = result.user
  next()
}

module.exports = { requireAuth, verifyToken }
