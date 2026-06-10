const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null
let SQL = null

function getDbPath() {
  return path.join(app.getPath('userData'), 'arcana.db')
}

async function init() {
  const initSqlJs = require('sql.js')
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')

  SQL = await initSqlJs({ locateFile: () => wasmPath })

  const dbPath = getDbPath()
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
}

function query(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function run(sql, params = []) {
  db.run(sql, params)
}

function save() {
  const data = db.export()
  fs.writeFileSync(getDbPath(), Buffer.from(data))
}

function runMigrations() {
  const MIGRATIONS = [
    require('./migrations/001_init'),
    require('./migrations/002_growth'),
    require('./migrations/003_hunting'),
    require('./migrations/004_breeding'),
    require('./migrations/005_fixes'),
  ]

  const [{ values: [[currentVersion]] }] = db.exec('PRAGMA user_version')

  MIGRATIONS.forEach((sqls, index) => {
    const version = index + 1
    if (currentVersion >= version) return
    sqls.forEach(sql => db.run(sql))
    db.run(`PRAGMA user_version = ${version}`)
  })
}

module.exports = { init, save, query, run, runMigrations }
