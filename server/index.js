const express = require('express')
const cors    = require('cors')
const http    = require('http')
const { WebSocketServer } = require('ws')
const { PORT } = require('./config')
const db      = require('./db/database')
const realtimeSocket = require('./realtime/socket')

const app = express()
app.use(cors({ origin: false }))
app.use(express.json())

// 라우터 등록
app.use('/auth',     require('./routes/auth'))
app.use('/save',     require('./routes/save'))
app.use('/ranking',  require('./routes/ranking'))
app.use('/breeding', require('./routes/breeding'))
app.use('/battle',   require('./routes/battle'))
app.use('/friends',  require('./routes/friends'))

app.get('/health', (_req, res) => res.json({ ok: true }))

const httpServer = http.createServer(app)
const wss = new WebSocketServer({ server: httpServer })
realtimeSocket.attach(wss)

db.init().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Arcana server running on http://localhost:${PORT} (WS 실시간 PvP 같은 포트)`)
  })
})

// 30초마다 DB 플러시
setInterval(() => db.save(), 30_000)
