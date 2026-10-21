const db = require('../../db/database')

class PvpSystem {
  constructor({ save }) {
    this.save = save
  }

  getCurrentSeason() {
    const row = db.query(
      'SELECT * FROM pvp_season WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    )[0]
    return row ?? this._createSeason()
  }

  recordResult(username, won) {
    const season = this.getCurrentSeason()
    db.run(
      `INSERT INTO pvp_stats (season_id, username, wins, losses)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(season_id, username)
       DO UPDATE SET wins = wins + ?, losses = losses + ?`,
      [season.id, username, won ? 1 : 0, won ? 0 : 1, won ? 1 : 0, won ? 0 : 1]
    )
    this.save()
  }

  getRanking(seasonNum) {
    const season = seasonNum != null
      ? db.query('SELECT * FROM pvp_season WHERE season_num = ?', [seasonNum])[0]
      : this.getCurrentSeason()
    if (!season) return { season: null, ranking: [] }

    const ranking = db.query(
      `SELECT username, wins, losses,
              ROUND(CAST(wins AS FLOAT) / MAX(wins + losses, 1) * 100, 1) AS winRate
       FROM pvp_stats WHERE season_id = ?
       ORDER BY wins DESC, losses ASC
       LIMIT 50`,
      [season.id]
    )
    return { season, ranking }
  }

  endSeason() {
    const season = db.query(
      'SELECT * FROM pvp_season WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    )[0]
    if (!season) return { ok: false, error: '활성 시즌 없음' }
    db.run('UPDATE pvp_season SET is_active = 0, ended_at = ? WHERE id = ?',
      [Date.now(), season.id])
    this.save()
    return { ok: true, season }
  }

  _createSeason() {
    const rows   = db.query('SELECT MAX(season_num) AS maxNum FROM pvp_season')
    const nextNum = (Number(rows[0]?.maxNum ?? 0)) + 1
    db.run('INSERT INTO pvp_season (season_num, started_at, is_active) VALUES (?, ?, 1)',
      [nextNum, Date.now()])
    this.save()
    return db.query(
      'SELECT * FROM pvp_season WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    )[0]
  }
}

module.exports = PvpSystem
