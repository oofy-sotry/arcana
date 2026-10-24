import fakeredis
import pytest

from arcana_gateway.jobs import JobQueue


@pytest.fixture
def redis():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture
def queue(redis):
    ids = iter(f"job{i}" for i in range(100))
    return JobQueue(redis, ttl_seconds=60, new_id=lambda: next(ids))


def test_submit_returns_id_and_queued_status(queue):
    job_id = queue.submit("summary", {"turns": [1, 2]})
    assert job_id == "job0"
    assert queue.get(job_id) == {"id": "job0", "kind": "summary", "status": "queued"}


def test_unknown_job_is_none(queue):
    assert queue.get("nope") is None


def test_claim_in_submit_order_and_marks_running(queue, redis):
    queue.submit("summary", {"n": 1})
    queue.submit("summary", {"n": 2})
    first = queue.claim(timeout=0.01)
    assert first == ("job0", "summary", {"n": 1})
    assert queue.get("job0")["status"] == "running"
    assert redis.lrange("arcana:jobs:processing", 0, -1) == ["job0"]
    assert queue.claim(timeout=0.01)[0] == "job1"


def test_claim_on_empty_queue_returns_none(queue):
    assert queue.claim(timeout=0.01) is None


def test_complete_stores_result_drops_payload_and_sets_ttl(queue, redis):
    queue.submit("summary", {"secret": "대화 원문"})
    queue.claim(timeout=0.01)
    queue.complete("job0", {"summary": "요약"})
    assert queue.get("job0") == {"id": "job0", "kind": "summary", "status": "done", "result": {"summary": "요약"}}
    assert redis.hget("arcana:job:job0", "payload") is None
    assert redis.lrange("arcana:jobs:processing", 0, -1) == []
    assert 0 < redis.ttl("arcana:job:job0") <= 60


def test_fail_stores_error(queue, redis):
    queue.submit("summary", {})
    queue.claim(timeout=0.01)
    queue.fail("job0", "공급자 429")
    assert queue.get("job0") == {"id": "job0", "kind": "summary", "status": "failed", "error": "공급자 429"}
    assert redis.lrange("arcana:jobs:processing", 0, -1) == []


def test_queued_job_also_expires(queue, redis):
    queue.submit("summary", {})
    assert 0 < redis.ttl("arcana:job:job0") <= 60


def test_claim_skips_expired_job(queue, redis):
    queue.submit("summary", {"n": 1})
    queue.submit("summary", {"n": 2})
    redis.delete("arcana:job:job0")  # 워커가 없는 동안 TTL로 사라진 job
    assert queue.claim(timeout=0.01) == ("job1", "summary", {"n": 2})
    assert redis.lrange("arcana:jobs:processing", 0, -1) == ["job1"]


def test_requeue_processing_after_worker_crash(queue, redis):
    queue.submit("summary", {"n": 1})
    queue.claim(timeout=0.01)  # 워커가 가져간 뒤 죽음 → 처리 중 목록에 남음
    assert queue.requeue_processing() == 1
    assert redis.lrange("arcana:jobs:processing", 0, -1) == []
    assert queue.get("job0")["status"] == "queued"
    assert queue.claim(timeout=0.01) == ("job0", "summary", {"n": 1})


def test_requeue_drops_expired_jobs(queue, redis):
    queue.submit("summary", {})
    queue.claim(timeout=0.01)
    redis.delete("arcana:job:job0")  # 그사이 TTL로 사라짐
    assert queue.requeue_processing() == 0
    assert redis.lrange("arcana:jobs:processing", 0, -1) == []
    assert redis.lrange("arcana:jobs:pending", 0, -1) == []


def test_requeue_keeps_order_before_new_jobs(queue):
    queue.submit("summary", {"n": 1})
    queue.claim(timeout=0.01)
    queue.submit("summary", {"n": 2})
    queue.requeue_processing()
    assert queue.claim(timeout=0.01)[0] == "job0"  # 먼저 들어온 job이 먼저
    assert queue.claim(timeout=0.01)[0] == "job1"
