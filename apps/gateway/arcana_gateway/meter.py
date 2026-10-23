# 응답 계측 — 공급자 응답 바이트는 손대지 않고 그대로 넘기면서, SSE 줄을 따로 읽어
# 첫 토큰(내용 또는 tool 호출)까지 시간과 usage(입력/출력 토큰)를 뽑는다
import json
import time


class StreamMeter:
    def __init__(self, now=time.monotonic):
        self._now = now
        self._started = now()
        self._first = None
        self._buffer = b""
        self.prompt_tokens = None
        self.completion_tokens = None

    def _mark_first(self):
        if self._first is None:
            self._first = self._now()

    def _take_usage(self, obj):
        usage = obj.get("usage")
        if usage:
            self.prompt_tokens = usage.get("prompt_tokens")
            self.completion_tokens = usage.get("completion_tokens")

    def _handle_line(self, line: bytes):
        if not line.startswith(b"data:"):
            return
        data = line[5:].strip()
        if not data or data == b"[DONE]":
            return
        try:
            obj = json.loads(data)
        except ValueError:
            return
        self._take_usage(obj)
        for choice in obj.get("choices") or []:
            delta = choice.get("delta") or {}
            if delta.get("content") or delta.get("tool_calls"):
                self._mark_first()

    def feed(self, chunk: bytes):
        # 네트워크 청크가 줄 중간에서 끊길 수 있어 마지막 미완성 줄은 다음 청크와 합친다
        self._buffer += chunk
        *lines, self._buffer = self._buffer.split(b"\n")
        for line in lines:
            self._handle_line(line)

    def feed_json(self, obj: dict):
        """스트리밍이 아닌 응답 — 본문 전체를 받은 때를 첫 토큰으로 본다"""
        self._mark_first()
        self._take_usage(obj)

    def finish(self) -> dict:
        if self._buffer:
            self._handle_line(self._buffer)
            self._buffer = b""
        end = self._now()
        ms = lambda t: round((t - self._started) * 1000)
        return {
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "first_token_ms": ms(self._first) if self._first is not None else None,
            "total_ms": ms(end),
        }
