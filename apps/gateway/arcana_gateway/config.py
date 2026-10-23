# 게이트웨이 설정 — 공급자 주소·모델 이름·요약 설정은 JSON에서 읽고, 키는 환경변수에서만 읽는다.
# 기본값은 config/gateway.default.json, 덮어쓰기는 ARCANA_GATEWAY_CONFIG가 가리키는 파일 (구역별로 합침)
import json
import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "gateway.default.json"


@dataclass(frozen=True)
class Upstream:
    name: str
    base_url: str
    api_key: str | None
    # 키가 필요한 공급자인데 키가 없으면 False
    available: bool


@dataclass(frozen=True)
class SummarySettings:
    model: str
    # 한 job에 받을 대화 턴 수 상한
    max_turns: int
    # 요약 결과 글자 수 상한
    max_chars: int
    # 끝난 job 결과를 Redis에 남겨 두는 시간
    result_ttl_seconds: int


@dataclass(frozen=True)
class GatewayConfig:
    upstreams: dict[str, Upstream]
    # 모델 이름 → 공급자 이름
    models: dict[str, str]
    summary: SummarySettings
    max_body_bytes: int
    upstream_timeout_seconds: float

    def upstream_for(self, model: str) -> Upstream | None:
        name = self.models.get(model)
        return self.upstreams[name] if name else None


def _read(path) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise ValueError(f"설정 파일을 읽을 수 없습니다: {path} ({err})") from err


def load_config(defaults_path=DEFAULT_CONFIG_PATH, override_path=None, env=os.environ) -> GatewayConfig:
    base = _read(defaults_path)
    override = _read(override_path) if override_path and Path(override_path).exists() else {}

    raw_upstreams = {**base["upstreams"], **override.get("upstreams", {})}
    models = {**base["models"], **override.get("models", {})}
    summary = {**base["summary"], **override.get("summary", {})}

    upstreams = {}
    for name, u in raw_upstreams.items():
        key_env = u.get("apiKeyEnv")
        api_key = env.get(key_env) if key_env else None
        upstreams[name] = Upstream(
            name=name,
            base_url=u["baseURL"].rstrip("/"),
            api_key=api_key or None,
            available=not key_env or bool(api_key),
        )

    for model, upstream in models.items():
        if upstream not in upstreams:
            raise ValueError(f"모델 {model}의 공급자가 설정에 없습니다: {upstream}")
    if summary["model"] not in models:
        raise ValueError(f"요약 모델이 models에 없습니다: {summary['model']}")

    return GatewayConfig(
        upstreams=upstreams,
        models=models,
        summary=SummarySettings(
            model=summary["model"],
            max_turns=summary["maxTurns"],
            max_chars=summary["maxChars"],
            result_ttl_seconds=summary["resultTtlSeconds"],
        ),
        max_body_bytes=override.get("maxBodyBytes", base["maxBodyBytes"]),
        upstream_timeout_seconds=override.get("upstreamTimeoutSeconds", base["upstreamTimeoutSeconds"]),
    )
