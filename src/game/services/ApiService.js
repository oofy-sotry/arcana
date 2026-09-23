const http  = require('http')
const https = require('https')

const DEFAULT_BASE_URL = process.env.ARCANA_SERVER_URL || 'http://localhost:4000'

class ApiService {
  constructor() {
    this._token   = null
    this._baseUrl = DEFAULT_BASE_URL
  }

  setToken(token) { this._token = token }
  getToken()      { return this._token  }

  setBaseUrl(url) { this._baseUrl = url || DEFAULT_BASE_URL }
  getBaseUrl()     { return this._baseUrl }

  _request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url  = new URL(path, this._baseUrl)
      const lib  = url.protocol === 'https:' ? https : http
      const data = body ? JSON.stringify(body) : null

      const options = {
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname + url.search,
        method,
        headers:  {
          'Content-Type': 'application/json',
          ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      }

      const req = lib.request(options, res => {
        let raw = ''
        res.on('data', chunk => { raw += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(raw)) }
          catch { resolve({ error: 'parse_error', status: res.statusCode }) }
        })
      })
      req.setTimeout(10_000, () => { req.destroy(); reject(new Error('timeout')) })
      req.on('error', reject)
      if (data) req.write(data)
      req.end()
    })
  }

  get(path)            { return this._request('GET',    path)       }
  post(path, body)     { return this._request('POST',   path, body) }
  delete(path, body)   { return this._request('DELETE', path, body) }

  async isServerReachable() {
    try {
      const res = await this.get('/health')
      return res.ok === true
    } catch {
      return false
    }
  }
}

module.exports = new ApiService()
