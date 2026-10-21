const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { startServer, registerUser } = require('./helpers')

let baseUrl, close

before(async () => {
  ({ baseUrl, close } = await startServer())
})

after(async () => {
  await close()
})

function authed(token, opts = {}) {
  return { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } }
}

function postOffer(token, body) {
  return fetch(`${baseUrl}/breeding/offers`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }))
}

test('GET /breeding/offers — 처음엔 빈 목록', async () => {
  const { token } = await registerUser(baseUrl)
  const res  = await fetch(`${baseUrl}/breeding/offers`, authed(token))
  const data = await res.json()
  assert.deepEqual(data.offers, [])
})

test('POST /breeding/offers — pet 누락 시 400', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await postOffer(token, { price: 100 })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'missing_pet')
})

test('POST /breeding/offers — price가 0 이하면 400', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await postOffer(token, { pet: { name: 'p' }, price: 0 })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'invalid_price')
})

test('POST /breeding/offers → 등록한 공고가 다른 유저에게 보임(본인 것은 제외)', async () => {
  const owner    = await registerUser(baseUrl)
  const observer = await registerUser(baseUrl)
  await postOffer(owner.token, { pet: { name: 'starter', attribute: 'fire' }, price: 150 })

  const ownerView    = await (await fetch(`${baseUrl}/breeding/offers`, authed(owner.token))).json()
  const observerView = await (await fetch(`${baseUrl}/breeding/offers`, authed(observer.token))).json()
  assert.equal(ownerView.offers.length, 0)
  assert.equal(observerView.offers.length, 1)
  assert.equal(observerView.offers[0].pet.name, 'starter')
  assert.equal(observerView.offers[0].price, 150)
})

test('POST /breeding/offers — 새 공고 등록 시 기존 공고는 비활성화됨', async () => {
  const owner    = await registerUser(baseUrl)
  const observer = await registerUser(baseUrl)
  await postOffer(owner.token, { pet: { name: 'first' }, price: 100 })
  await postOffer(owner.token, { pet: { name: 'second' }, price: 200 })

  const observerView = await (await fetch(`${baseUrl}/breeding/offers`, authed(observer.token))).json()
  const fromOwner = observerView.offers.filter(o => o.username === owner.username)
  assert.equal(fromOwner.length, 1)
  assert.equal(fromOwner[0].pet.name, 'second')
})

test('DELETE /breeding/offers/mine — 내 공고 취소 후 목록에서 사라짐', async () => {
  const owner    = await registerUser(baseUrl)
  const observer = await registerUser(baseUrl)
  await postOffer(owner.token, { pet: { name: 'starter' }, price: 100 })

  const delRes = await fetch(`${baseUrl}/breeding/offers/mine`, authed(owner.token, { method: 'DELETE' }))
  assert.equal(delRes.status, 200)

  const observerView = await (await fetch(`${baseUrl}/breeding/offers`, authed(observer.token))).json()
  assert.equal(observerView.offers.some(o => o.username === owner.username), false)
})

test('POST /breeding/offers/:id/request — 존재하지 않는 공고면 404', async () => {
  const { token } = await registerUser(baseUrl)
  const res = await fetch(`${baseUrl}/breeding/offers/9999/request`, authed(token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ myPet: { name: 'mine' } }),
  }))
  assert.equal(res.status, 404)
  assert.equal((await res.json()).error, 'offer_not_found')
})

test('POST /breeding/offers/:id/request — 본인 공고에 신청하면 400', async () => {
  const owner = await registerUser(baseUrl)
  await postOffer(owner.token, { pet: { name: 'starter' }, price: 100 })
  const offers = await (await fetch(`${baseUrl}/breeding/offers`, authed(owner.token))).json()

  // 본인 목록에는 안 보이므로 observer로 id를 얻어 owner 본인이 신청 시도
  const observer = await registerUser(baseUrl)
  const observerOffers = await (await fetch(`${baseUrl}/breeding/offers`, authed(observer.token))).json()
  const offerId = observerOffers.offers[0].id

  const res = await fetch(`${baseUrl}/breeding/offers/${offerId}/request`, authed(owner.token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ myPet: { name: 'mine' } }),
  }))
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'cannot_breed_own_pet')
})

test('POST /breeding/offers/:id/request — 정상 신청 시 자식 펫 생성 및 공고 비활성화', async () => {
  const owner = await registerUser(baseUrl)
  await postOffer(owner.token, { pet: { name: 'parentA', attribute: 'fire' }, price: 100 })

  const requester = await registerUser(baseUrl)
  const offers = await (await fetch(`${baseUrl}/breeding/offers`, authed(requester.token))).json()
  const offerId = offers.offers[0].id

  const res  = await fetch(`${baseUrl}/breeding/offers/${offerId}/request`, authed(requester.token, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ myPet: { name: 'parentB', attribute: 'water' } }),
  }))
  const data = await res.json()
  assert.equal(res.status, 200)
  assert.equal(data.child.name, 'parentA×parentB의 자식')
  assert.deepEqual(data.child.parents, ['parentA', 'parentB'])

  // 신청 후에는 다른 유저 목록에서도 사라짐(비활성화)
  const another   = await registerUser(baseUrl)
  const afterView = await (await fetch(`${baseUrl}/breeding/offers`, authed(another.token))).json()
  assert.equal(afterView.offers.some(o => o.username === owner.username), false)
})
