const path = require('path')
const fs   = require('fs')

const DEFAULT_DB_PATH = path.join(__dirname, '../../data/arcana-server.db')

let db     = null
let SQL    = null
let dbPath = DEFAULT_DB_PATH

// dbPath에 ':memory:'를 넘기면 파일 I/O 없이 순수 인메모리로 동작한다(테스트 격리용).
async function init(overridePath) {
  dbPath = overridePath || DEFAULT_DB_PATH
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()
  if (dbPath === ':memory:') {
    db = new SQL.Database()
  } else {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database()
  }
  runMigrations()
}

function save() {
  if (dbPath === ':memory:') return
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
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
