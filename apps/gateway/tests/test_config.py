import json

import pytest

from arcana_gateway.config import DEFAULT_CONFIG_PATH, load_config


def write(tmp_path, name, data):
    path = tmp_path / name
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


BASE = {
    "upstreams": {
        "gemini": {"baseURL": "https://example.test/openai/", "apiKeyEnv": "GEMINI_API_KEY"},
        "ollama": {"baseURL": "http://localhost:11434/v1"},
    },
    "models": {"flash": "gemini", "qwen": "ollama"},
    "summary": {"model": "flash", "maxTurns": 20, "maxChars": 400, "resultTtlSeconds": 3600},
    "maxBodyBytes": 1000,
    "upstreamTimeoutSeconds": 30,
}


def test_default_config_file_loads():
    config = load_config(DEFAULT_CONFIG_PATH, env={})
    assert config.summary.model in config.models
    for upstream in config.models.values():
        assert upstream in config.upstreams


def test_model_maps_to_upstream_with_key_from_env(tmp_path):
    config = load_config(write(tmp_path, "base.json", BASE), env={"GEMINI_API_KEY": "k1"})
    upstream = config.upstream_for("flash")
    assert upstream.name == "gemini"
    assert upstream.base_url == "https://example.test/openai"  # 끝 / 제거
    assert upstream.api_key == "k1"
    assert config.upstream_for("qwen").api_key is None


def test_unknown_model_has_no_upstream(tmp_path):
    config = load_config(write(tmp_path, "base.json", BASE), env={})
    assert config.upstream_for("gpt-x") is None


def test_missing_key_makes_upstream_unavailable(tmp_path):
    config = load_config(write(tmp_path, "base.json", BASE), env={})
    assert config.upstream_for("flash").available is False
    assert config.upstream_for("qwen").available is True


def test_override_file_merges_per_section(tmp_path):
    base = write(tmp_path, "base.json", BASE)
    override = write(tmp_path, "override.json", {
        "upstreams": {"ollama": {"baseURL": "http://host.docker.internal:11434/v1"}},
        "summary": {"maxTurns": 5},
    })
    config = load_config(base, override, env={})
    assert config.upstream_for("qwen").base_url == "http://host.docker.internal:11434/v1"
    assert config.upstream_for("flash").base_url == "https://example.test/openai"
    assert config.summary.max_turns == 5
    assert config.summary.model == "flash"


def test_model_pointing_to_unknown_upstream_is_rejected(tmp_path):
    bad = {**BASE, "models": {"flash": "nowhere"}}
    with pytest.raises(ValueError, match="nowhere"):
        load_config(write(tmp_path, "bad.json", bad), env={})


def test_summary_model_must_be_configured(tmp_path):
    bad = {**BASE, "summary": {**BASE["summary"], "model": "missing"}}
    with pytest.raises(ValueError, match="missing"):
        load_config(write(tmp_path, "bad.json", bad), env={})
