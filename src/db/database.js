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

function save() {
  const data = db.export()
  fs.writeFileSync(getDbPath(), Buffer.from(data))
}

module.exports = { init, save }
