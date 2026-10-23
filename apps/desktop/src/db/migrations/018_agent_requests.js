// AI 펫 에이전트 요청 기록 — 요청마다 한 줄 (메시지·답 원문은 저장하지 않음). 컬럼은 @arcana/agent toRequestRecord와 같다
module.exports = [
  `CREATE TABLE IF NOT EXISTS agent_requests (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at        INTEGER NOT NULL,
    ok                INTEGER NOT NULL,
    fail_reason       TEXT,
    route             TEXT,
    model_name        TEXT,
    model             TEXT,
    tool_count        INTEGER,
    fallback          TEXT,
    retries           INTEGER,
    prompt_tokens     INTEGER,
    completion_tokens INTEGER,
    first_token_ms    INTEGER,
    total_ms          INTEGER NOT NULL,
    cost_usd          REAL,
    tool_calls        INTEGER,
    steps             INTEGER,
    stopped_by        TEXT,
    context_chars     INTEGER,
    history_turns     INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_agent_requests_created ON agent_requests (created_at)`,
]
