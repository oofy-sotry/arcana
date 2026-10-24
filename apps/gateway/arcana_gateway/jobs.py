# Redis 작업 큐 — 대기 목록(LPUSH)에서 워커가 BLMOVE로 처리 중 목록으로 옮겨 가져가므로
# 워커가 처리 도중 죽어도 job이 처리 중 목록에 남고, 다음 워커 시작 때 requeue_processing으로 되돌린다. job 정보는 해시 하나, 끝나면 입력은 지우고 결과만 TTL 동안 둔다
import json
import uuid

PENDING = "arcana:jobs:pending"
PROCESSING = "arcana:jobs:processing"


def _key(job_id: str) -> str:
    return f"arcana:job:{job_id}"


class JobQueue:
    def __init__(self, redis, ttl_seconds: int, new_id=lambda: uuid.uuid4().hex):
        self._r = redis
        self._ttl = ttl_seconds
        self._new_id = new_id

    def submit(self, kind: str, payload: dict) -> str:
        job_id = self._new_id()
        pipe = self._r.pipeline()
        pipe.hset(_key(job_id), mapping={"kind": kind, "status": "queued", "payload": json.dumps(payload, ensure_ascii=False)})
        # 워커가 없어도 쌓이지 않게 대기 중인 job도 TTL을 둔다
        pipe.expire(_key(job_id), self._ttl)
        pipe.lpush(PENDING, job_id)
        pipe.execute()
        return job_id

    def get(self, job_id: str) -> dict | None:
        data = self._r.hgetall(_key(job_id))
        if not data:
            return None
        job = {"id": job_id, "kind": data["kind"], "status": data["status"]}
        if "result" in data:
            job["result"] = json.loads(data["result"])
        if "error" in data:
            job["error"] = data["error"]
        return job

    def claim(self, timeout: float):
        """다음 job을 가져와 running으로 바꾼다. 없으면 timeout초 기다린 뒤 None"""
        while True:
            job_id = self._r.blmove(PENDING, PROCESSING, timeout, "RIGHT", "LEFT")
            if job_id is None:
                return None
            data = self._r.hgetall(_key(job_id))
            if not data:  # TTL로 이미 사라진 job
                self._r.lrem(PROCESSING, 1, job_id)
                continue
            self._r.hset(_key(job_id), "status", "running")
            return job_id, data["kind"], json.loads(data["payload"])

    def requeue_processing(self) -> int:
        """처리 중 목록에 남은 job(워커가 처리 도중 죽은 것)을 대기 목록 앞쪽으로 되돌린다.
        워커가 하나라는 전제로 워커 시작 때만 부른다 — 여러 개면 다른 워커가 처리 중인 job까지 되돌린다"""
        moved = 0
        # 처리 중 목록은 왼쪽이 최근 — 최근 것부터 대기 목록 오른쪽(다음에 꺼낼 쪽)에 붙이면 가장 오래된 job이 맨 먼저 나온다
        while (job_id := self._r.lmove(PROCESSING, PENDING, "LEFT", "RIGHT")) is not None:
            if self._r.exists(_key(job_id)):
                self._r.hset(_key(job_id), "status", "queued")
                moved += 1
            else:
                self._r.lrem(PENDING, 1, job_id)
        return moved

    def _finish(self, job_id: str, fields: dict):
        pipe = self._r.pipeline()
        pipe.hset(_key(job_id), mapping=fields)
        pipe.hdel(_key(job_id), "payload")
        pipe.expire(_key(job_id), self._ttl)
        pipe.lrem(PROCESSING, 1, job_id)
        pipe.execute()

    def complete(self, job_id: str, result: dict):
        self._finish(job_id, {"status": "done", "result": json.dumps(result, ensure_ascii=False)})

    def fail(self, job_id: str, error: str):
        self._finish(job_id, {"status": "failed", "error": error})
