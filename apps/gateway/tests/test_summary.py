import json

import httpx
import pytest

from arcana_gateway.config import SummarySettings, Upstream
from arcana_gateway.summary import SummaryError, summarize, validate_payload

SETTINGS = SummarySettings(model="flash", max_turns=3, max_chars=50, result_ttl_seconds=60)
UPSTREAM = Upstream(name="gemini", base_url="https://up.test/v1", api_key="k1", available=True)


def test_valid_payload_is_cleaned():
    payload = validate_payload({"previous": " 이전 요약 ", "turns": [{"user": " 안녕 ", "reply": "반가워"}]}, SETTINGS)
    assert payload == {"previous": "이전 요약", "turns": [{"user": "안녕", "reply": "반가워"}]}


def test_previous_is_optional():
    assert validate_payload({"turns": [{"user": "a", "reply": "b"}]}, SETTINGS)["previous"] is None


@pytest.mark.parametrize("payload", [
    None,
    [],
    {"turns": []},
    {"turns": "안녕"},
    {"turns": [{"user": "a"}]},
    {"turns": [{"user": 1, "reply": "b"}]},
    {"turns": [{"user": "a", "reply": "b"}] * 4},  # max_turns 3 초과
    {"previous": 3, "turns": [{"user": "a", "reply": "b"}]},
])
def test_invalid_payload_is_rejected(payload):
    with pytest.raises(ValueError):
        validate_payload(payload, SETTINGS)


def test_long_text_is_clipped():
    payload = validate_payload({"turns": [{"user": "가" * 900, "reply": "나" * 900}]}, SETTINGS)
    assert len(payload["turns"][0]["user"]) <= 501
    assert len(payload["turns"][0]["reply"]) <= 501


def make_client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def ok_response(text, usage=None):
    body = {"choices": [{"message": {"role": "assistant", "content": text}}]}
    if usage:
        body["usage"] = usage
    return httpx.Response(200, json=body)


def test_summarize_calls_upstream_without_streaming():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return ok_response("불꽃이 배고파서 사과를 먹였다.", {"prompt_tokens": 90, "completion_tokens": 12})

    payload = {"previous": "처음 만남", "turns": [{"user": "밥 줘", "reply": "사과를 먹였어요"}]}
    text, usage = summarize(make_client(handler), UPSTREAM, SETTINGS, payload)

    assert text == "불꽃이 배고파서 사과를 먹였다."
    assert usage == {"prompt_tokens": 90, "completion_tokens": 12}
    assert seen["url"] == "https://up.test/v1/chat/completions"
    assert seen["auth"] == "Bearer k1"
    assert seen["body"]["model"] == "flash"
    assert seen["body"].get("stream") is not True
    prompt = "\n".join(m["content"] for m in seen["body"]["messages"])
    assert "처음 만남" in prompt and "밥 줘" in prompt and "사과를 먹였어요" in prompt
    assert "50자" in prompt
    assert "추측" in prompt  # 대화에 없는 상태("사냥 준비 중")를 덧붙이던 문제


def test_summary_is_clipped_to_max_chars():
    text, _ = summarize(make_client(lambda r: ok_response("가" * 80)), UPSTREAM, SETTINGS, {"previous": None, "turns": [{"user": "a", "reply": "b"}]})
    assert len(text) <= SETTINGS.max_chars


def test_upstream_error_raises_with_status():
    with pytest.raises(SummaryError) as info:
        summarize(make_client(lambda r: httpx.Response(429, text="quota")), UPSTREAM, SETTINGS, {"previous": None, "turns": [{"user": "a", "reply": "b"}]})
    assert info.value.status == 429


def test_empty_summary_is_error():
    with pytest.raises(SummaryError):
        summarize(make_client(lambda r: ok_response("  ")), UPSTREAM, SETTINGS, {"previous": None, "turns": [{"user": "a", "reply": "b"}]})
