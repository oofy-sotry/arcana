import pytest
from fastapi.testclient import TestClient

from arcana_gateway.main import build_app

TOKEN = "t" * 32


def test_token_is_required():
    with pytest.raises(RuntimeError, match="ARCANA_GATEWAY_TOKEN"):
        build_app({})


def test_short_token_is_rejected():
    with pytest.raises(RuntimeError, match="ARCANA_GATEWAY_TOKEN"):
        build_app({"ARCANA_GATEWAY_TOKEN": "short"})


def test_without_redis_url_jobs_are_off():
    client = TestClient(build_app({"ARCANA_GATEWAY_TOKEN": TOKEN}))
    assert client.get("/healthz").json() == {"ok": True, "queue": False}


def test_with_redis_url_jobs_are_on():
    client = TestClient(build_app({"ARCANA_GATEWAY_TOKEN": TOKEN, "REDIS_URL": "redis://127.0.0.1:1/0"}))
    assert client.get("/healthz").json()["queue"] is True


def test_upstream_key_comes_from_env():
    env = {"ARCANA_GATEWAY_TOKEN": TOKEN, "GEMINI_API_KEY": "k"}
    client = TestClient(build_app(env))
    ids = [m["id"] for m in client.get("/v1/models", headers={"Authorization": f"Bearer {TOKEN}"}).json()["data"]]
    assert "gemini-flash-lite-latest" in ids
    no_key = TestClient(build_app({"ARCANA_GATEWAY_TOKEN": TOKEN}))
    ids = [m["id"] for m in no_key.get("/v1/models", headers={"Authorization": f"Bearer {TOKEN}"}).json()["data"]]
    assert "gemini-flash-lite-latest" not in ids
