const express = require('express')
const cors    = require('cors')

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

module.exports = app
