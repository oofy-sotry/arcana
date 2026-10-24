# 요청·job 기록 — 한 줄에 JSON 하나. 메시지 원문과 키는 넣지 않는다
import json
import logging

logger = logging.getLogger("arcana_gateway")


def log_event(event: str, **fields):
    logger.info(json.dumps({"event": event, **fields}, ensure_ascii=False))
