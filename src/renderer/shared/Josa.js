// 받침에 맞는 조사 붙이기 — "이그나" + 은 → "이그나는", "잿빛 군주" + 을 → "잿빛 군주를"
// 브라우저(<script>)에서는 window.Josa, Node(main·테스트)에서는 require로 쓴다
;(function (root) {
  const PAIRS = {
    은: ['은', '는'], 는: ['은', '는'],
    이: ['이', '가'], 가: ['이', '가'],
    을: ['을', '를'], 를: ['을', '를'],
    과: ['과', '와'], 와: ['과', '와'],
    으로: ['으로', '로'], 로: ['으로', '로'],
  }
  // 숫자는 읽는 소리 기준 받침 (0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔은 받침 있음 / 1·7·8은 ㄹ)
  const DIGIT_JONG = { 0: 21, 1: 8, 2: 0, 3: 16, 4: 0, 5: 0, 6: 1, 7: 8, 8: 8, 9: 0 }
  const RIEUL = 8

  // 마지막 글자의 종성 번호 (0 = 받침 없음), 판단 불가면 null
  function jongseong(word) {
    const s = String(word ?? '').replace(/[\s)\]}"'.!?…~]+$/u, '')
    const ch = s[s.length - 1]
    if (!ch) return null
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28
    if (ch in DIGIT_JONG) return DIGIT_JONG[ch]
    return null
  }

  // particle: '은'/'는', '이'/'가', '을'/'를', '과'/'와', '으로'/'로' 중 아무 쪽
  function attach(word, particle) {
    const [withJong, withoutJong] = PAIRS[particle] || [particle, particle]
    const jong = jongseong(word)
    if (jong === null) return `${word}${withJong}(${withoutJong})` // 영문 등 판단 불가
    if (withJong === '으로') return `${word}${jong === 0 || jong === RIEUL ? '로' : '으로'}`
    return `${word}${jong === 0 ? withoutJong : withJong}`
  }

  const api = { attach, jongseong }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.Josa = api
})(typeof window !== 'undefined' ? window : globalThis)
