# 대화 요약 job — 데스크톱이 최근 대화에서 밀려난 턴과 이전 요약을 보내면 한 번의 호출로 합쳐 요약한다.
# 응답을 기다리는 사람이 없으므로 스트리밍하지 않는다
import httpx

from .config import SummarySettings, Upstream

TEXT_CLIP = 500


class SummaryError(Exception):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def _clip(text: str, limit: int) -> str:
    text = text.strip()
    return f"{text[:limit]}…" if len(text) > limit else text


def validate_payload(payload, settings: SummarySettings) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("요청 본문은 객체여야 합니다")
    previous = payload.get("previous")
    if previous is not None and not isinstance(previous, str):
        raise ValueError("previous는 문자열이어야 합니다")
    turns = payload.get("turns")
    if not isinstance(turns, list) or not turns:
        raise ValueError("turns는 비어 있지 않은 배열이어야 합니다")
    cleaned = []
    # 상한을 넘으면 거절하지 않고 최근 턴만 — 거절하면 데스크톱이 같은 턴을 계속 보내 요약이 영영 실패한다
    for turn in turns[-settings.max_turns:]:
        if not isinstance(turn, dict) or not isinstance(turn.get("user"), str) or not isinstance(turn.get("reply"), str):
            raise ValueError("각 턴은 user·reply 문자열이 있어야 합니다")
        cleaned.append({"user": _clip(turn["user"], TEXT_CLIP), "reply": _clip(turn["reply"], TEXT_CLIP)})
    return {
        "previous": _clip(previous, settings.max_chars) if previous and previous.strip() else None,
        "turns": cleaned,
    }


def _messages(payload: dict, max_chars: int) -> list[dict]:
    lines = [f"사용자: {t['user']}\n도우미: {t['reply']}" for t in payload["turns"]]
    parts = []
    if payload["previous"]:
        parts.append(f"이전 요약:\n{payload['previous']}")
    parts.append("이어진 대화:\n" + "\n\n".join(lines))
    return [
        {
            "role": "system",
            "content": (
                "너는 데스크톱 펫 RPG 대화 기록을 정리한다. 이전 요약과 이어진 대화를 합쳐, "
                f"다음 대화에 참고할 사실(펫 이름·한 행동·플레이어 부탁)만 한국어 평문 {max_chars}자 이내로 쓴다. "
                "대화에 없는 상태나 계획은 추측해서 덧붙이지 않는다. 인사·감탄은 빼고 마크다운 기호는 쓰지 않는다."
            ),
        },
        {"role": "user", "content": "\n\n".join(parts)},
    ]


def summarize(client: httpx.Client, upstream: Upstream, settings: SummarySettings, payload: dict):
    """(요약 글, usage) — 공급자 오류는 SummaryError"""
    headers = {"Authorization": f"Bearer {upstream.api_key}"} if upstream.api_key else {}
    try:
        res = client.post(
            f"{upstream.base_url}/chat/completions",
            json={"model": settings.model, "messages": _messages(payload, settings.max_chars)},
            headers=headers,
        )
    except httpx.HTTPError as err:
        raise SummaryError(f"공급자에 연결할 수 없습니다: {upstream.name} ({err})") from err
    if res.status_code != 200:
        raise SummaryError(f"공급자 응답 {res.status_code}: {res.text[:200]}", res.status_code)

    body = res.json()
    text = ((body.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
    text = text.strip()
    if not text:
        raise SummaryError("요약이 비어 있습니다")
    usage = body.get("usage") or {}
    return text[:settings.max_chars], {
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
    }
