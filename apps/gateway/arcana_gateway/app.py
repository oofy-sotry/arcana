# LLM 게이트웨이 — 데스크톱 에이전트가 공급자 대신 이 서버를 OpenAI 호환 주소로 쓴다.
# 에이전트 루프·tool은 데스크톱 main에 그대로 두고, 여기서는 공급자 키 보관·요청 계측·요약 job 큐만 맡는다
import hmac
import json
import re
import time

import httpx
import redis
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

from .config import GatewayConfig
from .jobs import JobQueue
from .logs import log_event
from .meter import StreamMeter
from .summary import validate_payload

JOB_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
# 공급자 응답에서 그대로 넘기지 않는 헤더 (길이·압축은 다시 계산된다)
HOP_HEADERS = {"content-length", "content-encoding", "transfer-encoding", "connection"}


def _error(status: int, message: str, kind: str) -> JSONResponse:
    return JSONResponse({"error": {"message": message, "type": kind}}, status_code=status)


def create_app(config: GatewayConfig, token: str, http_client: httpx.AsyncClient, queue: JobQueue | None, log=log_event, now=time.monotonic) -> FastAPI:
    app = FastAPI(title="arcana-gateway", docs_url=None, redoc_url=None)
    expected = f"Bearer {token}".encode()

    @app.middleware("http")
    async def require_token(request: Request, call_next):
        if request.url.path.startswith("/v1/"):
            given = request.headers.get("authorization", "").encode()
            if not hmac.compare_digest(given, expected):
                return _error(401, "게이트웨이 토큰이 올바르지 않습니다", "unauthorized")
        return await call_next(request)

    @app.get("/healthz")
    def health():
        return {"ok": True, "queue": queue is not None}

    @app.get("/v1/models")
    def models():
        data = [{"id": model, "object": "model", "owned_by": name}
                for model, name in config.models.items() if config.upstreams[name].available]
        return {"object": "list", "data": data}

    @app.post("/v1/chat/completions")
    async def chat(request: Request):
        raw = await request.body()
        if len(raw) > config.max_body_bytes:
            return _error(413, f"요청 본문은 {config.max_body_bytes}바이트까지 받습니다", "too_large")
        try:
            body = json.loads(raw)
        except ValueError:
            return _error(400, "JSON 본문이 아닙니다", "invalid_request")
        if not isinstance(body, dict) or not isinstance(body.get("model"), str) or not isinstance(body.get("messages"), list):
            return _error(400, "model 문자열과 messages 배열이 필요합니다", "invalid_request")

        model = body["model"]
        upstream = config.upstream_for(model)
        if upstream is None:
            return _error(404, f"설정에 없는 모델입니다: {model}", "model_not_found")
        if not upstream.available:
            return _error(503, f"공급자 키가 없습니다: {upstream.name}", "upstream_unavailable")

        stream = body.get("stream") is True
        meter = StreamMeter(now=now)
        fields = {"model": model, "upstream": upstream.name, "stream": stream}
        headers = {"Content-Type": "application/json"}
        if upstream.api_key:
            headers["Authorization"] = f"Bearer {upstream.api_key}"

        upstream_req = http_client.build_request("POST", f"{upstream.base_url}/chat/completions", content=raw, headers=headers)
        try:
            res = await http_client.send(upstream_req, stream=True)
        except httpx.HTTPError as err:
            log("chat", **fields, ok=False, status=502, error=type(err).__name__, **meter.finish())
            return _error(502, f"공급자에 연결할 수 없습니다: {upstream.name}", "upstream_unreachable")

        passed_headers = {k: v for k, v in res.headers.items() if k.lower() not in HOP_HEADERS}

        # 오류 응답(429 포함)은 상태와 본문을 그대로 돌려준다 — 데스크톱이 재시도·폴백을 판단한다
        if res.status_code != 200 or not stream:
            content = await res.aread()
            await res.aclose()
            if res.status_code == 200:
                try:
                    meter.feed_json(json.loads(content))
                except ValueError:
                    pass
            log("chat", **fields, ok=res.status_code == 200, status=res.status_code, **meter.finish())
            return Response(content, status_code=res.status_code, headers=passed_headers)

        async def relay():
            ok = False
            try:
                # aiter_bytes는 압축을 푼 바이트 — content-encoding 헤더를 빼고 넘기므로 raw가 아니라 이것을 쓴다
                async for chunk in res.aiter_bytes():
                    meter.feed(chunk)
                    yield chunk
                ok = True
            finally:
                await res.aclose()
                log("chat", **fields, ok=ok, status=200, **meter.finish())

        return StreamingResponse(relay(), status_code=200, headers=passed_headers)

    @app.post("/v1/jobs/summary")
    async def submit_summary(request: Request):
        if queue is None:
            return _error(503, "작업 큐를 쓸 수 없습니다", "queue_unavailable")
        try:
            payload = validate_payload(await request.json(), config.summary)
        except ValueError as err:
            return _error(400, str(err), "invalid_request")
        try:
            job_id = queue.submit("summary", payload)
        except redis.RedisError:
            return _error(503, "작업 큐에 연결할 수 없습니다", "queue_unavailable")
        log("job_submitted", job=job_id, kind="summary", turns=len(payload["turns"]))
        return JSONResponse({"id": job_id, "status": "queued"}, status_code=202)

    @app.get("/v1/jobs/{job_id}")
    def get_job(job_id: str):
        if queue is None:
            return _error(503, "작업 큐를 쓸 수 없습니다", "queue_unavailable")
        if not JOB_ID.match(job_id):
            return _error(400, "job id 형식이 올바르지 않습니다", "invalid_request")
        try:
            job = queue.get(job_id)
        except redis.RedisError:
            return _error(503, "작업 큐에 연결할 수 없습니다", "queue_unavailable")
        if job is None:
            return _error(404, "없는 job입니다 (끝난 지 오래되면 지워집니다)", "not_found")
        return job

    return app
