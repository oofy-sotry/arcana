import json

import fakeredis
import httpx
import pytest

from arcana_gateway.config import load_config
from arcana_gateway.jobs import JobQueue
from arcana_gateway.worker import CLAIM_TIMEOUT, connect_redis, process_one

TURN = {"user": "밥 줘", "reply": "사과를 먹였어요"}


@pytest.fixture
def config(tmp_path):
    path = tmp_path / "gw.json"
    path.write_text(json.dumps({
        "upstreams": {"gemini": {"baseURL": "https://up.test/v1", "apiKeyEnv": "GEMINI_API_KEY"}},
        "models": {"flash": "gemini"},
        "summary": {"model": "flash", "maxTurns": 5, "maxChars": 100, "resultTtlSeconds": 60},
        "maxBodyBytes": 10000,
        "upstreamTimeoutSeconds": 5,
    }), encoding="utf-8")
    return load_config(path, env={"GEMINI_API_KEY": "k1"})


@pytest.fixture
def queue():
    return JobQueue(fakeredis.FakeRedis(decode_responses=True), ttl_seconds=60)


def client_with(*responses):
    calls = []

    def handler(request):
        calls.append(request)
        return responses[min(len(calls), len(responses)) - 1]

    client = httpx.Client(transport=httpx.MockTransport(handler))
    client.calls = calls
    return client


def ok(text):
    return httpx.Response(200, json={"choices": [{"message": {"content": text}}], "usage": {"prompt_tokens": 10, "completion_tokens": 4}})


def run(queue, client, config, events=None):
    log = (lambda event, **fields: events.append({"event": event, **fields})) if events is not None else (lambda *a, **k: None)
    return process_one(queue, client, config, timeout=0.01, retry_delay=0, log=log)


def test_empty_queue_does_nothing(queue, config):
    assert run(queue, client_with(ok("x")), config) is False


def test_summary_job_completes(queue, config):
    job_id = queue.submit("summary", {"previous": None, "turns": [TURN]})
    events = []
    assert run(queue, client_with(ok("불꽃에게 사과를 먹였다")), config, events) is True
    assert queue.get(job_id)["result"] == {"summary": "불꽃에게 사과를 먹였다"}
    assert events[0]["event"] == "summary"
    assert events[0]["ok"] is True
    assert events[0]["prompt_tokens"] == 10
    assert "밥 줘" not in json.dumps(events, ensure_ascii=False)  # 대화 원문은 기록하지 않음


def test_rate_limit_is_retried_once(queue, config):
    job_id = queue.submit("summary", {"previous": None, "turns": [TURN]})
    client = client_with(httpx.Response(429, text="quota"), ok("요약"))
    run(queue, client, config)
    assert len(client.calls) == 2
    assert queue.get(job_id)["status"] == "done"


def test_upstream_failure_marks_failed(queue, config):
    job_id = queue.submit("summary", {"previous": None, "turns": [TURN]})
    client = client_with(httpx.Response(500, text="boom"))
    events = []
    run(queue, client, config, events)
    assert len(client.calls) == 1  # 429가 아니면 다시 시도하지 않음
    job = queue.get(job_id)
    assert job["status"] == "failed"
    assert "500" in job["error"]
    assert events[0]["ok"] is False


def test_invalid_payload_fails_without_calling_upstream(queue, config):
    job_id = queue.submit("summary", {"turns": []})
    client = client_with(ok("x"))
    run(queue, client, config)
    assert client.calls == []
    assert queue.get(job_id)["status"] == "failed"


def test_unknown_kind_fails(queue, config):
    job_id = queue.submit("diary", {})
    run(queue, client_with(ok("x")), config)
    assert queue.get(job_id)["status"] == "failed"


def test_redis_socket_timeout_is_longer_than_claim_wait():
    # redis-py 8 기본 소켓 시간 초과(5초)가 BLMOVE 대기(5초)보다 먼저 끝나 워커가 TimeoutError로 죽던 문제
    r = connect_redis("redis://127.0.0.1:6380/0")
    assert r.connection_pool.connection_kwargs["socket_timeout"] > CLAIM_TIMEOUT
