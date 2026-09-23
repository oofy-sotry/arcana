const http    = require('http')
const { WebSocketServer } = require('ws')
const { PORT } = require('./config')
const db      = require('./db/database')
const realtimeSocket = require('./realtime/socket')
const app     = require('./app')

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
