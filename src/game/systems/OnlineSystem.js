const api = require('../services/ApiService')

class OnlineSystem {
  constructor({ Pet, save }) {
    this.Pet  = Pet
    this.save = save

    const db = require('../../db/database')
    const tokenRow = db.query("SELECT value FROM world_state WHERE key = 'auth_token'")[0]
    if (tokenRow?.value) api.setToken(tokenRow.value)
  }

  isLoggedIn() { return !!api.getToken() }

  getUsername() {
    const db = require('../../db/database')
    return db.query("SELECT value FROM world_state WHERE key = 'online_username'")[0]?.value ?? null
  }

  _storeCredentials(token, username) {
    const db = require('../../db/database')
    db.run("INSERT OR REPLACE INTO world_state (key, value) VALUES ('auth_token', ?)",    [token])
    db.run("INSERT OR REPLACE INTO world_state (key, value) VALUES ('online_username', ?)", [username])
    this.save()
  }

  _clearCredentials() {
    const db = require('../../db/database')
    db.run("DELETE FROM world_state WHERE key IN ('auth_token', 'online_username')")
    this.save()
  }

  async register(username, email, password) {
    const res = await api.post('/auth/register', { username, email, password })
    if (res.token) {
      api.setToken(res.token)
      this._storeCredentials(res.token, res.username)
    }
    return res
  }

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    if (res.token) {
      api.setToken(res.token)
      this._storeCredentials(res.token, res.username)
    }
    return res
  }

  logout() {
    api.setToken(null)
    this._clearCredentials()
  }

  // 펫 스냅샷 서버 업로드
  async syncPets() {
    const pets = this.Pet.getAllPets().map(p => ({
      name:            p.name,
      attribute:       p.attribute,
      attribute2:      p.attribute2,
      evolution_stage: p.evolution_stage,
      level:           p.level,
      hp:              p.hp,
      attack:          p.attack,
      defense:         p.defense,
      speed:           p.speed,
    }))
    return api.post('/save/sync', { pets })
  }

  // 랭킹
  getRanking(category = 'level') {
    return api.get(`/ranking/${category}`)
  }

  // 온라인 교배
  listBreedingOffers()          { return api.get('/breeding/offers') }
  postBreedingOffer(pet, price) { return api.post('/breeding/offers', { pet, price }) }
  cancelBreedingOffer()         { return api.delete('/breeding/offers/mine') }
  requestBreeding(offerId, myPet) {
    return api.post(`/breeding/offers/${offerId}/request`, { myPet })
  }

  // PvP 배틀
  challengeBattle(targetUsername, myPet) {
    return api.post('/battle/challenge', { targetUsername, myPet })
  }
  getBattleHistory() { return api.get('/battle/history') }

  // 친구
  getFriends()                 { return api.get('/friends') }
  addFriend(username)          { return api.post('/friends', { username }) }
  removeFriend(friendId)       { return api.delete(`/friends/${friendId}`) }
  getFriendPets(username)      { return api.get(`/friends/${username}/pets`) }

  isServerReachable() { return api.isServerReachable() }
}

module.exports = OnlineSystem
