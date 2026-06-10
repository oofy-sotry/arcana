const { Router } = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const db      = require('../db/database')
const { JWT_SECRET, JWT_EXPIRY } = require('../config')

const router = Router()

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {}
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'username_length' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password_too_short' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' })
  }

  const existing = db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username])
  if (existing.length) return res.status(409).json({ error: 'already_exists' })

  const hash = await bcrypt.hash(password, 10)
  db.run(
    'INSERT INTO users (username, email, password_hash, created_at) VALUES (?,?,?,?)',
    [username, email, hash, Date.now()]
  )
  const user  = db.query('SELECT id, username FROM users WHERE email = ?', [email])[0]
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY })

  db.save()
  res.json({ ok: true, token, username: user.username })
})

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })

  const user = db.query('SELECT id, username, password_hash FROM users WHERE email = ?', [email])[0]
  if (!user) return res.status(401).json({ error: 'invalid_credentials' })

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return res.status(401).json({ error: 'invalid_credentials' })

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY })
  res.json({ ok: true, token, username: user.username })
})

module.exports = router
