const express = require('express')
const cors    = require('cors')
const { PORT } = require('./config')
const db      = require('./db/database')

const app = express()
app.use(cors())
app.use(express.json())

// 라우터 등록
app.use('/auth',     require('./routes/auth'))
app.use('/save',     require('./routes/save'))
app.use('/ranking',  require('./routes/ranking'))
app.use('/breeding', require('./routes/breeding'))
app.use('/battle',   require('./routes/battle'))
app.use('/friends',  require('./routes/friends'))

app.get('/health', (_req, res) => res.json({ ok: true }))

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Arcana server running on http://localhost:${PORT}`)
  })
})

// 30초마다 DB 플러시
setInterval(() => db.save(), 30_000)
