#!/usr/bin/env bash
# docker compose로 띄운 서버·게이트웨이·워커·Redis 스모크 검사 — CI와 VM에서 같이 쓴다
# 사용: ARCANA_GATEWAY_TOKEN=<토큰> deploy/smoke.sh [서버 주소] [게이트웨이 주소]
# Gemini 키가 없어도 돈다: 요약 job은 워커가 가져가 끝내기만 하면(done 또는 failed) 통과
set -euo pipefail

SERVER=${1:-http://127.0.0.1:4000}
GATEWAY=${2:-http://127.0.0.1:8000}
TOKEN=${ARCANA_GATEWAY_TOKEN:?ARCANA_GATEWAY_TOKEN이 필요합니다}

fail() { echo "FAIL: $*" >&2; exit 1; }
ok()   { echo "ok   $*"; }

# 서비스가 뜰 때까지 최대 60초
wait_for() {
  for _ in $(seq 1 60); do
    curl -fsS "$1" >/dev/null 2>&1 && return 0
    sleep 1
  done
  fail "$1 응답 없음"
}

wait_for "$SERVER/health"
ok "서버 /health"

wait_for "$GATEWAY/healthz"
health=$(curl -fsS "$GATEWAY/healthz")
[[ $health == *'"queue":true'* ]] || fail "게이트웨이 큐가 꺼져 있음: $health"
ok "게이트웨이 /healthz (큐 켜짐)"

code=$(curl -s -o /dev/null -w '%{http_code}' "$GATEWAY/v1/models")
[[ $code == 401 ]] || fail "토큰 없이 /v1/models가 $code"
ok "토큰 없으면 401"

code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$GATEWAY/v1/models")
[[ $code == 200 ]] || fail "토큰으로 /v1/models가 $code"
ok "토큰으로 /v1/models 200"

job=$(curl -fsS -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"previous":null,"turns":[{"user":"스모크 검사","reply":"확인"}]}' "$GATEWAY/v1/jobs/summary")
id=$(sed -n 's/.*"id":"\([A-Za-z0-9_-]*\)".*/\1/p' <<<"$job")
[[ -n $id ]] || fail "요약 job 제출 실패: $job"
ok "요약 job 제출 ($id)"

for _ in $(seq 1 60); do
  status=$(curl -fsS -H "Authorization: Bearer $TOKEN" "$GATEWAY/v1/jobs/$id" | sed -n 's/.*"status":"\([a-z]*\)".*/\1/p')
  if [[ $status == done || $status == failed ]]; then
    ok "워커가 job 처리 (status=$status)"
    echo "스모크 검사 통과"
    exit 0
  fi
  sleep 1
done
fail "워커가 60초 안에 job을 처리하지 않음 (status=$status)"
