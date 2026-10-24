# 실행 진입점 — uvicorn arcana_gateway.main:build_app --factory
# 환경변수: ARCANA_GATEWAY_TOKEN(필수, 데스크톱이 보낼 토큰), GEMINI_API_KEY 등 공급자 키,
# REDIS_URL(없으면 요약 job만 꺼짐), ARCANA_GATEWAY_CONFIG(설정 덮어쓰기 파일)
import logging
import os

import httpx
import redis

from .app import create_app
from .config import DEFAULT_CONFIG_PATH, load_config
from .jobs import JobQueue

MIN_TOKEN_LENGTH = 16


def build_app(env=None):
    env = os.environ if env is None else env
    token = env.get("ARCANA_GATEWAY_TOKEN", "")
    if len(token) < MIN_TOKEN_LENGTH:
        raise RuntimeError(f"ARCANA_GATEWAY_TOKEN 환경변수에 {MIN_TOKEN_LENGTH}자 이상 토큰이 필요합니다")

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    config = load_config(DEFAULT_CONFIG_PATH, env.get("ARCANA_GATEWAY_CONFIG"), env=env)
    # 기본 주소로 아무 Redis에나 붙지 않도록 REDIS_URL을 준 경우에만 큐를 켠다
    redis_url = env.get("REDIS_URL")
    queue = JobQueue(redis.Redis.from_url(redis_url, decode_responses=True), config.summary.result_ttl_seconds) if redis_url else None
    http = httpx.AsyncClient(timeout=config.upstream_timeout_seconds)
    return create_app(config, token=token, http_client=http, queue=queue)
