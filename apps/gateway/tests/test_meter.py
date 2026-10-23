import json

from arcana_gateway.meter import StreamMeter


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def sse(obj):
    return f"data: {json.dumps(obj)}\n\n".encode()


def content(text):
    return sse({"choices": [{"delta": {"content": text}}]})


USAGE = sse({"choices": [], "usage": {"prompt_tokens": 120, "completion_tokens": 8}})


def test_first_token_and_total_time():
    clock = Clock()
    meter = StreamMeter(now=clock)
    clock.t = 0.2
    meter.feed(sse({"choices": [{"delta": {"role": "assistant"}}]}))  # 내용 없는 조각은 첫 토큰이 아님
    clock.t = 0.5
    meter.feed(content("안녕"))
    clock.t = 0.9
    meter.feed(content("하세요"))
    meter.feed(USAGE)
    meter.feed(b"data: [DONE]\n\n")
    clock.t = 1.25
    result = meter.finish()
    assert result == {"prompt_tokens": 120, "completion_tokens": 8, "first_token_ms": 500, "total_ms": 1250}


def test_tool_call_counts_as_first_token():
    clock = Clock()
    meter = StreamMeter(now=clock)
    clock.t = 0.3
    meter.feed(sse({"choices": [{"delta": {"tool_calls": [{"id": "c1", "function": {"name": "get_pets"}}]}}]}))
    assert meter.finish()["first_token_ms"] == 300


def test_line_split_across_chunks():
    meter = StreamMeter(now=Clock())
    raw = content("가") + USAGE
    for i in range(0, len(raw), 7):
        meter.feed(raw[i:i + 7])
    result = meter.finish()
    assert result["prompt_tokens"] == 120
    assert result["completion_tokens"] == 8


def test_broken_json_is_ignored():
    meter = StreamMeter(now=Clock())
    meter.feed(b"data: {not json\n\n")
    meter.feed(USAGE)
    assert meter.finish()["prompt_tokens"] == 120


def test_no_usage_gives_none():
    meter = StreamMeter(now=Clock())
    meter.feed(content("가"))
    result = meter.finish()
    assert result["prompt_tokens"] is None
    assert result["completion_tokens"] is None


def test_non_stream_json_body():
    clock = Clock()
    meter = StreamMeter(now=clock)
    clock.t = 0.4
    meter.feed_json({"choices": [{"message": {"content": "답"}}], "usage": {"prompt_tokens": 50, "completion_tokens": 3}})
    result = meter.finish()
    assert result == {"prompt_tokens": 50, "completion_tokens": 3, "first_token_ms": 400, "total_ms": 400}
