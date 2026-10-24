import json
import logging

from arcana_gateway.logs import log_event


def test_log_event_writes_one_json_line(caplog):
    with caplog.at_level(logging.INFO, logger="arcana_gateway"):
        log_event("chat", model="flash", ok=True, prompt_tokens=None, note="한글")
    assert len(caplog.records) == 1
    assert json.loads(caplog.records[0].getMessage()) == {
        "event": "chat", "model": "flash", "ok": True, "prompt_tokens": None, "note": "한글",
    }
