const path = require('path')
const fs   = require('fs')

const DB_PATH = path.join(__dirname, '../../data/arcana-server.db')

let db  = null
let SQL = null

async function init() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH))
  } else {
    db = new SQL.Database()
  }
  runMigrations()
}

function save() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()))
}

function query(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function run(sql, params = []) {
  db.run(sql, params)
}

function runMigrations() {
  const MIGRATIONS = [
    require('./migrations/001_users'),
    require('./migrations/002_online'),
  ]
  const _vResult = db.exec('PRAGMA user_version')
  const ver = _vResult[0]?.values[0]?.[0] ?? 0
  MIGRATIONS.forEach((sqls, i) => {
    if (ver >= i + 1) return
    sqls.forEach(s => db.run(s))
    db.run(`PRAGMA user_version = ${i + 1}`)
  })
  save()
}

module.exports = { init, save, query, run }
