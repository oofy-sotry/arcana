import json

import fakeredis
import httpx
import pytest
from fastapi.testclient import TestClient

from arcana_gateway.app import create_app
from arcana_gateway.config import load_config
from arcana_gateway.jobs import JobQueue

TOKEN = "gw-token"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture
def config(tmp_path):
    path = tmp_path / "gw.json"
    path.write_text(json.dumps({
        "upstreams": {
            "gemini": {"baseURL": "https://gemini.test/v1", "apiKeyEnv": "GEMINI_API_KEY"},
            "ollama": {"baseURL": "http://ollama.test/v1"},
            "nokey": {"baseURL": "https://nokey.test/v1", "apiKeyEnv": "MISSING_KEY"},
        },
        "models": {"flash": "gemini", "qwen": "ollama", "locked": "nokey"},
        "summary": {"model": "flash", "maxTurns": 3, "maxChars": 100, "resultTtlSeconds": 60},
        "maxBodyBytes": 2000,
        "upstreamTimeoutSeconds": 5,
    }), encoding="utf-8")
    return load_config(path, env={"GEMINI_API_KEY": "gem-key"})


class Upstream:
    """가짜 공급자 — 받은 요청을 기록하고 정해 둔 응답을 돌려준다"""

    def __init__(self):
        self.requests = []
        self.response = httpx.Response(200, json={})
        self.error = None

    def handler(self, request):
        self.requests.append(request)
        if self.error:
            raise self.error
        return self.response


@pytest.fixture
def upstream():
    return Upstream()


@pytest.fixture
def queue():
    return JobQueue(fakeredis.FakeRedis(decode_responses=True), ttl_seconds=60)


@pytest.fixture
def events():
    return []


def make_client(config, upstream, queue, events):
    http = httpx.AsyncClient(transport=httpx.MockTransport(upstream.handler))
    log = lambda event, **fields: events.append({"event": event, **fields})
    return TestClient(create_app(config, token=TOKEN, http_client=http, queue=queue, log=log))


@pytest.fixture
def client(config, upstream, queue, events):
    return make_client(config, upstream, queue, events)


def sse(*objs):
    return b"".join(f"data: {json.dumps(o)}\n\n".encode() for o in objs) + b"data: [DONE]\n\n"


CHAT = {"model": "flash", "messages": [{"role": "user", "content": "안녕"}], "stream": True}


# ---- 인증 ----

@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong"}, {"Authorization": TOKEN}])
def test_requests_without_valid_token_are_rejected(client, headers):
    assert client.get("/v1/models", headers=headers).status_code == 401
    assert client.post("/v1/chat/completions", json=CHAT, headers=headers).status_code == 401
    assert client.post("/v1/jobs/summary", json={}, headers=headers).status_code == 401
    assert client.get("/v1/jobs/abc", headers=headers).status_code == 401


def test_health_needs_no_token(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"ok": True, "queue": True}


# ---- 모델 목록 ----

def test_models_lists_only_available_upstreams(client):
    res = client.get("/v1/models", headers=AUTH)
    assert res.status_code == 200
    ids = [m["id"] for m in res.json()["data"]]
    assert ids == ["flash", "qwen"]


# ---- 채팅 프록시 ----

def test_stream_is_passed_through_with_upstream_key(client, upstream, events):
    body = sse(
        {"choices": [{"delta": {"content": "안"}}]},
        {"choices": [{"delta": {"content": "녕"}}]},
        {"choices": [], "usage": {"prompt_tokens": 30, "completion_tokens": 2}},
    )
    upstream.response = httpx.Response(200, content=body, headers={"content-type": "text/event-stream"})

    res = client.post("/v1/chat/completions", json=CHAT, headers=AUTH)

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    assert res.content == body
    sent = upstream.requests[0]
    assert str(sent.url) == "https://gemini.test/v1/chat/completions"
    assert sent.headers["authorization"] == "Bearer gem-key"  # 데스크톱 토큰이 아니라 공급자 키
    assert json.loads(sent.content) == CHAT
    assert events[-1]["event"] == "chat"
    assert events[-1]["model"] == "flash"
    assert events[-1]["ok"] is True
    assert events[-1]["prompt_tokens"] == 30
    assert events[-1]["completion_tokens"] == 2
    assert events[-1]["first_token_ms"] is not None
    assert "안녕" not in json.dumps(events, ensure_ascii=False)  # 메시지 원문은 기록하지 않음


def test_upstream_without_key_gets_no_auth_header(client, upstream):
    upstream.response = httpx.Response(200, content=sse({"choices": []}))
    client.post("/v1/chat/completions", json={**CHAT, "model": "qwen"}, headers=AUTH)
    assert str(upstream.requests[0].url) == "http://ollama.test/v1/chat/completions"
    assert "authorization" not in upstream.requests[0].headers


def test_non_stream_response_is_passed_through(client, upstream, events):
    upstream.response = httpx.Response(200, json={"choices": [{"message": {"content": "답"}}], "usage": {"prompt_tokens": 5, "completion_tokens": 1}})
    res = client.post("/v1/chat/completions", json={**CHAT, "stream": False}, headers=AUTH)
    assert res.status_code == 200
    assert res.json()["choices"][0]["message"]["content"] == "답"
    assert events[-1]["prompt_tokens"] == 5


def test_rate_limit_status_is_passed_through(client, upstream, events):
    upstream.response = httpx.Response(429, json={"error": {"message": "quota"}})
    res = client.post("/v1/chat/completions", json=CHAT, headers=AUTH)
    assert res.status_code == 429
    assert res.json() == {"error": {"message": "quota"}}
    assert events[-1]["ok"] is False
    assert events[-1]["status"] == 429


def test_unreachable_upstream_is_502(client, upstream, events):
    upstream.error = httpx.ConnectError("refused")
    res = client.post("/v1/chat/completions", json=CHAT, headers=AUTH)
    assert res.status_code == 502
    assert events[-1]["ok"] is False


def test_unknown_model_is_404(client, upstream):
    res = client.post("/v1/chat/completions", json={**CHAT, "model": "gpt-x"}, headers=AUTH)
    assert res.status_code == 404
    assert upstream.requests == []


def test_model_without_key_is_503(client, upstream):
    res = client.post("/v1/chat/completions", json={**CHAT, "model": "locked"}, headers=AUTH)
    assert res.status_code == 503
    assert upstream.requests == []


@pytest.mark.parametrize("content", [b"not json", b"[]", json.dumps({"model": "flash"}).encode(),
                                     json.dumps({"model": "flash", "messages": "hi"}).encode()])
def test_malformed_body_is_400(client, upstream, content):
    res = client.post("/v1/chat/completions", content=content, headers={**AUTH, "content-type": "application/json"})
    assert res.status_code == 400
    assert upstream.requests == []


def test_body_over_limit_is_413(client, upstream):
    big = {**CHAT, "messages": [{"role": "user", "content": "가" * 3000}]}
    res = client.post("/v1/chat/completions", json=big, headers=AUTH)
    assert res.status_code == 413
    assert upstream.requests == []


# ---- 요약 job ----

SUMMARY = {"previous": None, "turns": [{"user": "밥 줘", "reply": "사과를 먹였어요"}]}


def test_submit_summary_job_and_read_status(client, queue):
    res = client.post("/v1/jobs/summary", json=SUMMARY, headers=AUTH)
    assert res.status_code == 202
    job_id = res.json()["id"]
    assert res.json()["status"] == "queued"

    claimed = queue.claim(timeout=0.01)
    assert claimed == (job_id, "summary", SUMMARY)
    queue.complete(job_id, {"summary": "사과를 먹였다"})

    res = client.get(f"/v1/jobs/{job_id}", headers=AUTH)
    assert res.status_code == 200
    assert res.json() == {"id": job_id, "kind": "summary", "status": "done", "result": {"summary": "사과를 먹였다"}}


def test_invalid_summary_payload_is_400(client):
    res = client.post("/v1/jobs/summary", json={"turns": []}, headers=AUTH)
    assert res.status_code == 400


def test_unknown_job_is_404(client):
    assert client.get("/v1/jobs/0123abcd", headers=AUTH).status_code == 404


def test_bad_job_id_is_400(client):
    assert client.get("/v1/jobs/a.b", headers=AUTH).status_code == 400


def test_jobs_unavailable_without_queue_but_chat_still_works(config, upstream, events):
    client = make_client(config, upstream, None, events)
    assert client.post("/v1/jobs/summary", json=SUMMARY, headers=AUTH).status_code == 503
    assert client.get("/healthz").json() == {"ok": True, "queue": False}
    upstream.response = httpx.Response(200, content=sse({"choices": []}))
    assert client.post("/v1/chat/completions", json=CHAT, headers=AUTH).status_code == 200


def test_jobs_503_when_redis_is_down(config, upstream, events):
    server = fakeredis.FakeServer()
    server.connected = False  # 연결 끊김 — 명령마다 ConnectionError
    down = JobQueue(fakeredis.FakeRedis(server=server, decode_responses=True), ttl_seconds=60)
    client = make_client(config, upstream, down, events)
    assert client.post("/v1/jobs/summary", json=SUMMARY, headers=AUTH).status_code == 503
    assert client.get("/v1/jobs/abc", headers=AUTH).status_code == 503
