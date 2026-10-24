# 큐 워커 — Redis에서 job을 하나씩 가져와 처리한다. 지금은 대화 요약(summary)만 있다.
# 실행: python -m arcana_gateway.worker (REDIS_URL, GEMINI_API_KEY, ARCANA_GATEWAY_CONFIG 환경변수)
import logging
import os
import time

import httpx
import redis

from .config import DEFAULT_CONFIG_PATH, GatewayConfig, load_config
from .jobs import JobQueue
from .logs import log_event
from .summary import SummaryError, summarize, validate_payload


def _summarize_with_retry(client, upstream, settings, payload, retry_delay):
    # 무료 한도 초과(429)는 잠시 뒤 한 번 다시
    try:
        return summarize(client, upstream, settings, payload)
    except SummaryError as err:
        if err.status != 429:
            raise
        time.sleep(retry_delay)
        return summarize(client, upstream, settings, payload)


def process_one(queue: JobQueue, client: httpx.Client, config: GatewayConfig, timeout: float = 5, retry_delay: float = 2, log=log_event) -> bool:
    """job 하나를 처리하면 True, timeout 동안 job이 없으면 False"""
    claimed = queue.claim(timeout)
    if claimed is None:
        return False
    job_id, kind, payload = claimed
    if kind != "summary":
        queue.fail(job_id, f"알 수 없는 작업입니다: {kind}")
        return True

    settings = config.summary
    started = time.monotonic()
    try:
        payload = validate_payload(payload, settings)
        text, usage = _summarize_with_retry(client, config.upstream_for(settings.model), settings, payload, retry_delay)
    except (ValueError, SummaryError) as err:
        queue.fail(job_id, str(err))
        log("summary", job=job_id, model=settings.model, ok=False, error=str(err)[:200],
            total_ms=round((time.monotonic() - started) * 1000))
        return True

    queue.complete(job_id, {"summary": text})
    log("summary", job=job_id, model=settings.model, ok=True, turns=len(payload["turns"]),
        prompt_tokens=usage["prompt_tokens"], completion_tokens=usage["completion_tokens"],
        total_ms=round((time.monotonic() - started) * 1000))
    return True


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise SystemExit("REDIS_URL 환경변수가 필요합니다 (예: redis://localhost:6379/0)")
    config = load_config(DEFAULT_CONFIG_PATH, os.environ.get("ARCANA_GATEWAY_CONFIG"))
    queue = JobQueue(redis.Redis.from_url(redis_url, decode_responses=True), ttl_seconds=config.summary.result_ttl_seconds)
    with httpx.Client(timeout=config.upstream_timeout_seconds) as client:
        log_event("worker_started", model=config.summary.model)
        while True:
            try:
                process_one(queue, client, config)
            except redis.ConnectionError as err:
                # Redis가 잠깐 끊겨도 워커는 살아 있다가 다시 붙는다
                log_event("worker_redis_error", error=str(err)[:200])
                time.sleep(3)


if __name__ == "__main__":
    main()
