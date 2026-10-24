# 아르카나 (Arcana)

> 데스크톱 위를 돌아다니는 에레멘탈과 함께하는 육성 수집 RPG

---

## 프로젝트 소개

**아르카나**는 Electron 기반 데스크톱 펫 게임입니다.  
펫(에레멘탈)이 실제 바탕화면 위를 돌아다니며, 플레이어는 계약자로서 에레멘탈과 계약하고 함께 성장합니다.

몬스터 육성·수집 장르의 오리지널 세계관을 배경으로,  
육성 / 진화 / 수집 / 교배를 통해 전설의 에레멘탈 **옴니렉스**를 향해 나아갑니다.

개인 프로젝트이며, 운영 중인 서비스가 아닙니다.

### 한눈에 보기

| 영역 | 내용 |
|---|---|
| Electron | main / preload / renderer 분리, `contextIsolation`, IPC 라우터 한 곳 등록, 투명 오버레이 창 클릭 통과, 트레이, electron-builder 설치 파일 + 자동 업데이트 |
| AI 펫 에이전트 | 자연어 요청 → 기존 게임 함수를 tool로 호출 (main 프로세스, TypeScript). 단계 상한·입력 검증·공급자 장애 시 에이전트만 꺼짐 |
| 모델 라우팅 · 컨텍스트 | 잡담은 작은 모델, tool이 필요한 요청은 큰 모델에 필요한 tool만. 상태는 요청에 필요한 부분만 넣음 |
| 비용 · 지연 | 요청마다 모델·토큰·첫 토큰·전체 시간·환산 비용·tool 수·성공을 DB에 기록. 같은 요청 20개 × 3조건 비교로 **입력 토큰 -47%, 환산 비용 -37%** ([측정 결과](#측정-결과)) |
| LLM 게이트웨이 · 큐 | Python FastAPI OpenAI 호환 게이트웨이(키 보관·요청 계측) + Redis 큐 워커로 대화 요약을 응답 경로 밖에서 처리 |
| 모노레포 | pnpm workspaces + Turborepo — Electron 앱, Express 서버, FastAPI 게이트웨이, 공용 패키지 4개 |
| 배포 | GitHub Actions: 테스트 → Windows 설치 파일 → Releases, 서버·게이트웨이 이미지 → 스모크 검사 → ghcr.io, VM에서 docker compose |

---

## 기술 구조

### 프로세스 구조

```
┌──────────────────────── Main 프로세스 (Node.js) ─────────────────────────┐
│ GameWorld      게임 시스템 21개 생성·DI, 60초 tick(컨디션·나이·에너지)   │
│                sql.js(WebAssembly SQLite) 저장 + 마이그레이션 18개       │
│ IpcRouter      invoke 채널 95개를 한 파일에서 등록                        │
│ WindowManager  투명 오버레이 창 · 런처 창 · 트레이                        │
│ AgentService   AI 펫 에이전트 루프 (@arcana/agent, TypeScript)            │
│ ApiService     서버 REST 호출 (HTTP, JWT)                                 │
│ updater        GitHub Releases 자동 업데이트 (electron-updater)           │
│ logger         파일 로그 + 에러는 서버 /client-log로 전송                 │
└──────▲────────────────────────────────▲──────────────────────▲──────────┘
       │ IPC (invoke / send,            │ HTTP · WebSocket     │ OpenAI 호환 HTTP (SSE)
       │  main→renderer 이벤트 2개)     │                      │
┌──────┴──────────────────────┐  ┌──────┴─────────────────┐  ┌─┴──────────────────────┐
│ Preload                     │  │ apps/server            │  │ Gemini API / Ollama    │
│ contextBridge로             │  │ Express + ws           │  │ (또는 apps/gateway 경유)│
│ window.arcana.* 만 노출     │  │ JWT 인증 · 세이브 ·    │  └────────────────────────┘
└──────▲──────────────────────┘  │ 랭킹 · 교배 · 친구 ·   │
       │                         │ 실시간 매칭 큐         │
┌──────┴────────────────────────────────────────────┐  └──────▲─────────────────┘
│ Renderer                                          │         │ WebSocket
│ 오버레이: PixiJS — 바탕화면 위를 걷는 펫           ├─────────┘ (실시간 PvP·파티 사냥)
│ 런처/월드맵: Canvas 2D + DOM 패널 (도우미 탭 포함)  │
│ 사냥(턴제 전투): PixiJS — 런처 창 안에서 화면 전환  │
└───────────────────────────────────────────────────┘
```

게임 상태를 바꾸는 로직은 모두 main 프로세스의 `apps/desktop/src/game/systems`에 있고, renderer는 화면 표시와 입력만 담당합니다.
AI 에이전트도 main 프로세스에서 돌고, renderer는 IPC로 요청을 보내 토큰 스트림을 받아 표시만 합니다.

### 보안 설정

- 모든 `BrowserWindow`는 `contextIsolation: true`, `nodeIntegration: false` (`apps/desktop/src/main/windowManager.js`).
  renderer에서 Node API(`fs`, `child_process` 등)를 쓸 수 없으므로, 화면 코드에 문제가 생겨도 파일 시스템·DB에 직접 접근하지 못합니다.
- preload는 `ipcRenderer`를 그대로 노출하지 않고, 기능별 함수(`window.arcana.pet.getAll()` 등)만 `contextBridge`로 노출합니다.
  renderer가 호출할 수 있는 채널이 preload에 적힌 목록으로 제한됩니다.
- 각 화면 HTML에 Content-Security-Policy를 둬서 외부 스크립트 로드를 막습니다(`script-src 'self'`).
  PixiJS를 쓰는 오버레이·사냥 화면만 PixiJS 내부 동작 때문에 `'unsafe-eval'`과 `worker-src blob:`을 허용합니다.

### IPC 설계

- 채널 이름은 `도메인:동작` 형식(`pet:get-all`, `hunting:manual-battle`, `online:login` …)이고, 전부 `apps/desktop/src/main/ipcRouter.js` 한 곳에서 등록합니다.
- `IpcRouter`는 생성자로 게임 시스템들을 주입받아 호출만 하므로, 시스템 로직은 Electron 없이 `node --test`로 테스트할 수 있습니다.
- 요청·응답은 `ipcRenderer.invoke` / `ipcMain.handle`, 응답이 필요 없는 신호(오버레이 마우스 전환)만 `send` / `on`을 씁니다.
- `ipcMain.handle`의 반환값은 구조적 복제를 거치므로 `BrowserWindow` 같은 객체를 반환하지 않도록 합니다(실제로 겪은 버그).

### 오버레이 클릭 통과

오버레이는 화면 전체 크기의 투명·항상 위 창이라, 그대로 두면 바탕화면 클릭을 전부 가로챕니다.

1. 창을 만들 때 `setIgnoreMouseEvents(true, { forward: true })` — 클릭은 아래 창으로 통과시키고, 마우스 이동 이벤트만 오버레이에 전달합니다.
2. 펫 스프라이트에 `pointerover`가 오면 `overlay:toggle-mouse(false)`를 보내 그 순간만 클릭을 받습니다.
3. `pointerout`이 오면 다시 `true`로 돌려 클릭 통과 상태로 복귀합니다.

`forward: true`가 없으면 클릭 통과 상태에서 hover 이벤트도 받지 못해, 펫 위에 마우스를 올렸는지 알 수 없습니다.

### 서버

`apps/server`는 Express REST API(`/auth`, `/save`, `/ranking`, `/breeding`, `/battle`, `/friends`, `/client-log`)와
같은 HTTP 서버에 붙은 WebSocket(`ws`)으로 구성됩니다. 인증은 bcrypt 해시 + JWT, 저장소는 sql.js입니다.
실시간 PvP·파티 사냥은 서버 메모리의 매칭 큐(`apps/server/realtime/queue.js`, `partyQueue.js`, `huntMatch.js`)로 짝을 맞춥니다.
서버가 없어도 싱글플레이는 전부 동작하고, 온라인 탭만 연결 실패로 표시됩니다.

### 모노레포 구성

pnpm workspaces + Turborepo로 클라이언트·서버·게이트웨이·공용 패키지를 한 저장소에서 관리합니다.

| 패키지 | 언어 | 역할 |
|---|---|---|
| `apps/desktop` | JS | Electron 클라이언트 |
| `apps/server` | JS | Express + WebSocket 온라인 서버 |
| `apps/gateway` | Python | FastAPI LLM 게이트웨이 + Redis 큐 요약 워커 (`package.json`은 turbo가 pytest를 함께 돌리기 위한 스크립트만) |
| `packages/agent` | TypeScript | AI 펫 에이전트 — 설정, OpenAI 호환 스트리밍 클라이언트, 에이전트 루프, 라우팅, 컨텍스트 선택, 요청 기록 |
| `packages/game-core` | JS | 클라이언트·서버가 함께 쓰는 게임 규칙 — 속성 상성, 데미지 공식, 몬스터 데이터 |
| `packages/shared` | TypeScript | IPC 채널 이름 목록과 공용 데이터 타입(`Pet`, `Attribute` …) |

기존 JS 코드는 그대로 두고, 새로 만든 에이전트와 공용 타입만 TypeScript로 썼습니다.

- 전환 전에는 서버가 클라이언트 파일을 `../../src/game/...` 상대 경로로 직접 불러왔습니다. 이 공용 로직을 `game-core`로 분리해 서버를 클라이언트 폴더 없이 따로 배포할 수 있게 했습니다.
- `packages/shared`의 채널 목록은 `apps/desktop/test/ipcChannels.test.js`가 `ipcRouter.js`·`preload.js`의 실제 채널과 비교해, 코드와 목록이 어긋나면 테스트가 실패합니다.
- `turbo run test`는 의존 패키지 빌드(`^build` — shared의 `tsc`)를 먼저 실행한 뒤 패키지별 테스트를 병렬로 돌립니다.

### 실행 · 테스트 · 빌드

```bash
pnpm install                              # 전체 워크스페이스 설치 (pnpm 12)
pnpm --filter desktop start              # 클라이언트 실행 (서버 없이도 동작)
JWT_SECRET=<랜덤 값> pnpm --filter server start   # 온라인 서버 (기본 포트 4000)

pnpm test                                # 전체 테스트 (turbo run test)
pnpm --filter desktop build              # electron-builder 설치 파일 생성
```

Windows 설치 파일은 `apps/desktop`에서 `pnpm exec electron-builder --win --x64`로 만듭니다(Linux에서는 wine 필요).

서버 주소는 기본값 `http://localhost:4000`이며, 게임 안 온라인 탭에서 바꿀 수 있습니다(환경변수 `ARCANA_SERVER_URL`로 초기값 지정 가능).

---

## AI 펫 에이전트

런처의 **도우미** 탭에서 "배고파 보이면 밥 주고 레벨 맞는 사냥터 가줘"처럼 말하면, 에이전트가 펫 상태·가방을 보고 사료를 쓰고 사냥터를 골라 자동 사냥까지 실행합니다.
코드는 `packages/agent`(TypeScript)에 있고, desktop main(`apps/desktop/src/main/index.js`)이 게임 함수를 주입해 씁니다.

```
renderer(도우미 탭) ──agent:chat──▶ main: AgentService
                                     │ 1. 라우팅: 키워드 규칙으로 필요한 tool 판단
                                     │ 2. 컨텍스트 선택: 그 tool에 필요한 상태만 프롬프트에
                                     │ 3. 에이전트 루프: 모델 ↔ tool (단계 상한 6)
                                     │      tool = 기존 게임 시스템 함수 (agentGameApi.js)
                                     │ 4. 요청 기록: 토큰·지연·환산 비용 → DB
◀──agent:token / agent:tool (스트림)─┘
```

### 설계 원칙

- **tool은 기존 게임 함수만 호출**: 펫 상태·가방 조회, 아이템 사용, 사냥터 조회, 자동 사냥, 파티 조회 6개. 게임 상태를 바꾸는 새 로직을 tool 안에 만들지 않아, 버튼으로 할 때와 같은 규칙(에너지·기절·수량 검사)이 그대로 적용됩니다.
- **실행 전 검증**: tool 입력은 스키마로 검사하고(없는 펫·아이템, 잘못된 타입은 실행하지 않고 오류를 모델에 돌려줌), 사용자 메시지는 500자까지, 실행 단계는 6번까지.
- **키는 main 프로세스에만**: 환경변수 `GEMINI_API_KEY` 또는 `userData/agent-secrets.json`. renderer·preload·로그·DB에 키가 남지 않는 것을 파일 182개 검색으로 확인했습니다.
- **공급자 장애에도 게임은 그대로**: 키 없음·연결 불가·설정 오류면 에이전트만 꺼지고 도우미 탭에 이유를 표시합니다.
- **모델 출력은 `textContent`로만 표시**해 HTML로 해석되지 않게 합니다.
- **모델 이름·공급자 주소·라우팅 키워드·단가는 설정 파일**(`packages/agent/config/agent.default.json`, 사용자 덮어쓰기 `userData/agent.json`)에 둡니다.

### 모델 라우팅

| 모델 | 용도 | 이유 |
|---|---|---|
| 작은 모델 — Ollama `qwen2.5:3b` (로컬 CPU) | tool 없는 짧은 대화(인사·감사·잡담) | 비용 0. 하지만 tool 6개 프롬프트로는 한 단계에 수 분 걸리고, 실측에서 21분 동안 tool을 1번만 부르고 실행 없이 설명만 함 |
| 큰 모델 — Gemini `gemini-flash-lite-latest` | tool이 필요한 요청 | 같은 요청을 4단계·tool 3번·첫 토큰 약 1.5초로 끝냄 |

- 분류는 규칙 기반입니다. tool마다 키워드와 함께 넣을 tool(`use_item`이면 `get_inventory`)을 설정에 적고, 걸리는 tool만 큰 모델에 줍니다.
- 잘못 분류됐을 때: 잡담 모델은 게임 기능이 필요하면 `NEED_TOOLS`라고만 답하게 했고, 그 답이나 시간 초과(20초)·오류가 나오면 tool 전체를 주고 큰 모델로 다시 보냅니다. 애매하면 큰 모델 쪽으로 보내는 것이 안전한 쪽입니다.
- 무료 한도 초과(429)는 잠시 뒤 한 번 다시 시도합니다.
- 고정 요청 20개(`packages/agent/test/fixtures/requests.json`)로 `pnpm --filter @arcana/agent route-report`를 돌리면 라우팅 일치 20/20, 프롬프트에 넣는 상태+tool 설명이 평균 2094자 → 637자(-70%)입니다.

### 컨텍스트 선택과 대화 기록

- 잡담이면 펫 이름·레벨만, tool 요청이면 펫 상태 수치, 아이템 tool이면 가방 요약까지 넣습니다. 값은 tool의 `run()`을 그대로 재사용합니다.
- 상태를 미리 넣으면 "상태 조회" 단계가 빠집니다. 완료 기준 문장이 **6단계·tool 5번·입력 4822토큰 → 4단계·tool 3번·3380토큰**이 됐습니다(단계 상한 6에 걸리던 문제도 해소).
- 대화 기록은 최근 4턴만 원문으로 두고, 오래된 턴은 규칙 기반 요약 한 줄로 바꿉니다. 게이트웨이를 켜면 밀려난 턴을 [Redis 큐 워커](#llm-게이트웨이와-작업-큐)가 LLM으로 요약하고, 결과가 오기 전까지는 규칙 요약을 씁니다(응답은 요약을 기다리지 않음).

### 비용 · 지연 기록

요청마다 `agent_requests` 테이블(마이그레이션 018)에 모델, 입력/출력 토큰, 첫 토큰까지 시간, 전체 시간, 환산 비용, tool 호출 수, 성공 여부를 남깁니다(메시지 원문은 저장하지 않음). 도우미 탭의 📊 통계에서 모델별 평균 지연·토큰·비용을 볼 수 있습니다.
무료 공급자라 실제 과금은 없으므로, 설정의 참고 단가표(Gemini Flash-Lite 유료 단가 입력 $0.25 · 출력 $1.5 / 100만 토큰)로 환산합니다.

### 측정 결과

같은 요청 20개를 세 조건으로 실행했습니다(`pnpm --filter @arcana/agent benchmark`, 원본 `packages/agent/bench/2026-10-23-same-model.json`).
라우팅·컨텍스트 선택만의 효과를 보려고 **잡담·tool 모두 같은 모델(Gemini)** 로 쟀습니다.

| 조건 | 성공 | 평균 입력 토큰 | 환산 비용 합 | 전체 시간 중앙값 | 단계 상한 도달 | 기대 행동 실행 |
|---|---|---|---|---|---|---|
| ① 큰 모델 + 상태 전부 | 20/20 | 1188 | $0.00721 | 2.00초 | 0 | 5/5 |
| ② 라우팅만 | 20/20 | 726 (-39%) | $0.00496 (-31%) | 1.45초 | 0 | 5/5 |
| ③ 라우팅 + 컨텍스트 선택 | 20/20 | 628 (**-47%**) | $0.00458 (**-37%**) | 1.80초 | 0 | 5/5 |

- **품질 확인**: 입력을 줄여도 평균 tool 호출 수(0.65)가 세 조건 같고, 실제로 게임 상태를 바꿔야 하는 요청 5개(사료·물약 사용, 자동 사냥)는 세 조건 모두 기대한 행동을 실행했습니다.
- **지연은 중앙값**으로 적었습니다. ③의 평균은 3.10초인데, 한 건(19.3초, 첫 토큰 0.77초·재시도 없음)이 공급자 응답 지연으로 튄 영향입니다.
- 한 번 잰 결과이고 요청 수가 20개라, 비율은 경향으로 봐 주세요.

---

## LLM 게이트웨이와 작업 큐

`apps/gateway`(Python FastAPI)는 데스크톱 에이전트가 Gemini 대신 붙을 수 있는 OpenAI 호환 주소입니다. 설정으로 켤 때만 쓰고, 기본은 데스크톱이 Gemini에 직접 붙습니다.

```
desktop main (에이전트 루프·tool) ──OpenAI 호환──▶ gateway (FastAPI) ──▶ Gemini / Ollama
        │ 밀려난 대화 턴                              │ 공급자 키는 서버 환경변수에만
        └─POST /v1/jobs/summary─▶ Redis 대기 목록 ─BLMOVE─▶ 워커 ──▶ Gemini
          GET /v1/jobs/:id ◀── 결과 (TTL 1시간, 입력 대화는 삭제)
```

- **왜 에이전트를 서버로 옮기지 않았나**: 게임 상태와 tool이 데스크톱 로컬 DB에 있어서, 서버가 루프를 돌리면 tool을 부를 때마다 데스크톱과 왕복해야 합니다. 루프는 main에 두고, 서버는 키 보관·계측·오래 걸리는 작업만 맡았습니다.
- **게이트웨이**: `/v1/chat/completions`는 SSE 스트림을 그대로 넘기고, 데스크톱은 Gemini 키 대신 게이트웨이 토큰만 가집니다. 요청마다 모델·토큰·첫 토큰·전체 시간·상태를 JSON 한 줄로 남깁니다(원문 없음). 429 등 공급자 상태 코드는 그대로 돌려줘 데스크톱의 재시도·폴백이 그대로 동작하고, 응답 헤더는 `content-type`·`retry-after`만 넘깁니다.
- **큐 작업은 대화 요약**: LLM 요약은 응답 지연과 무료 한도 때문에 응답 경로에서 뺐던 기능입니다. 큐로 옮겨 응답 지연 없이 되살렸습니다. 결과가 오기 전·실패·60초 초과면 규칙 요약을 그대로 쓰고, 실패 뒤 60초는 다시 보내지 않습니다.
- **job이 사라지지 않게**: 워커는 `BLMOVE`로 대기 목록에서 처리 중 목록으로 옮겨 가져갑니다. 처리 도중 죽으면 다음 시작 때 처리 중 목록을 되돌립니다(워커 강제 종료 실험으로 확인, 워커 하나 전제).
- **실측**: 게이트웨이가 더하는 첫 토큰 지연은 약 20~30ms(클라이언트 3498ms / 게이트웨이 3472ms). 4턴 대화에서 밀려난 첫 턴을 워커가 약 3초에 요약했고, 다음 요청에 그 요약이 들어가 앞에서 말한 이름을 기억했습니다.

데스크톱에서 켜려면 `userData/agent.json`에 아래처럼 쓰고, `agent-secrets.json`에 `gatewayToken`을 넣습니다.

```json
{
  "models":  { "large": { "provider": "gateway", "model": "gemini-flash-lite-latest" } },
  "summary": { "enabled": true }
}
```

---

## 핵심 특징

- 🖥️ **데스크톱 위를 자유롭게 돌아다니는 펫** — 창 안에 갇히지 않음
- ⚔️ **10가지 속성 + 혼합 속성 + 전속성** — 수백 가지 캐릭터 경로
- 🧬 **교배 체인 시스템** — 불호환 속성끼리 교배해 극희귀 혼합 속성 탄생
- 🌙 **2가지 성장 축** — 나이(시간)와 레벨(활동)이 독립적으로 기여
- 👥 **파티 시스템** — 주인공 + 에레멘탈이 함께 포메이션으로 돌아다님
- 📖 **5챕터 메인 스토리 + 히든 엔딩** — 선택이 결말을 바꾸는 서사

---

## 현재 상태 (2026-10-21 기준, v0.2.3)

| 단계 | 상태 |
|------|------|
| 기획 (GDD) | ✅ 완료 (구현 후 갱신 반영 — [GDD 25장](https://github.com/oofy-sotry/arcana/wiki/GDD)) |
| 아키텍처 설계 | ✅ 완료 ([ARCHITECTURE](https://github.com/oofy-sotry/arcana/wiki/ARCHITECTURE)) |
| Core Loop (펫 생성·시간·컨디션) | ✅ 완료 |
| 성장·진화·스킬·아이템 + 런처 UI | ✅ 완료 |
| 사냥터·전투 | ✅ 완료 |
| 교배·가챠·파티 | ✅ 완료 |
| 스토리 5챕터·퀘스트 | ✅ 완료 |
| 온라인 (서버·인증·PvP·친구) | ✅ 완료 |
| 장비·세력·히든엔딩·PvP 시즌 | ✅ 완료 |
| 소환사·월드맵 | ✅ 완료 |
| 골드버전 형식 개편 (기절·회복소·상점·턴제 전투·포획·체육관·육성소) | ✅ 1~5단계 + 6-1 완료, 6-2 두 번째 마을부터 진행 예정 |
| 스프라이트 | 🔶 일부 — 캐릭터 스프라이트 130장(`assets/sprites/characters`) 배치, 몬스터·UI·사운드·아이템 이미지는 미제작(색상 도형으로 대체 표시) |

> 전체 진행 체크리스트는 [COMMIT_PLAN](https://github.com/oofy-sotry/arcana/wiki/COMMIT_PLAN), 남은 작업은
> [ROADMAP](https://github.com/oofy-sotry/arcana/wiki/ROADMAP) Phase 8 "남은 작업 후보" 참조.

---

## 브랜치 구조

```
main              → 현재 개발 브랜치 (아르카나)
legacy/tamagotchi → 초기 프로토타입 코드 보존 (구 다마고치)
```

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 플랫폼 | Electron |
| 언어 | JavaScript (CommonJS, Main/DB/Game 레이어 — 프리로드 contextBridge), TypeScript (`packages/shared`) |
| 렌더링 | PixiJS v8 (ES 모듈) |
| 저장소 (클라이언트) | sql.js (WebAssembly SQLite) |
| 저장소 (서버) | sql.js — `apps/server` Express 앱 |
| 모노레포 | pnpm workspaces + Turborepo |
| 온라인 | 완료 — JWT 인증, 랭킹, 온라인 교배, PvP 시즌, 친구 |

---

## 문서

모든 설계·기획 문서는 **[GitHub Wiki](https://github.com/oofy-sotry/arcana/wiki)** 로 이관되었습니다.

- 📋 [게임 디자인 문서 (GDD)](https://github.com/oofy-sotry/arcana/wiki/GDD) — 전체 게임 설계 + 구현 현황 갱신(25장)
- 🏗️ [아키텍처 설계서](https://github.com/oofy-sotry/arcana/wiki/ARCHITECTURE) — 프로세스 구조, DB, IPC 규칙
- 🗺️ [전체 로드맵](https://github.com/oofy-sotry/arcana/wiki/ROADMAP) — Phase별 완료 기준·의존성
- ✅ [커밋 계획 체크리스트](https://github.com/oofy-sotry/arcana/wiki/COMMIT_PLAN) — 커밋 단위 진행 이력
- ⚖️ [세력 시스템](https://github.com/oofy-sotry/arcana/wiki/FACTION_SYSTEM) · 📖 [스토리 설계](https://github.com/oofy-sotry/arcana/wiki/STORY_DESIGN) · 🗺️ [구역 설계](https://github.com/oofy-sotry/arcana/wiki/ZONES_DESIGN)
- 📐 [커밋 규칙](https://github.com/oofy-sotry/arcana/wiki/COMMIT_RULES)

---

## 프로젝트 구조

```
arcana/
├── apps/
│   ├── desktop/             # Electron 클라이언트
│   │   ├── src/
│   │   │   ├── main/        # 게임 월드, 창 관리, IPC 라우터, 로거
│   │   │   ├── preload/     # contextBridge API (window.arcana.*)
│   │   │   ├── renderer/    # 오버레이 · 런처 · 월드맵 · 사냥 화면
│   │   │   ├── game/        # 게임 시스템(systems) · 데이터(data) · 서비스(services)
│   │   │   └── db/          # sql.js 저장소 · 마이그레이션
│   │   ├── test/            # 클라이언트 테스트 (node --test)
│   │   └── assets/          # 캐릭터 스프라이트 130장 (ui · audio · items는 아직 미제작)
│   └── server/              # 온라인 기능 서버 (Express + ws + sql.js)
├── packages/
│   ├── game-core/           # 공용 게임 규칙 (속성 상성 · 데미지 공식 · 몬스터 데이터)
│   └── shared/              # TypeScript — IPC 채널 이름 · 공용 타입
├── docs/                    # 진행 상황 · AI 작업 기록
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

> 설계 문서는 [Wiki](https://github.com/oofy-sotry/arcana/wiki)에 있습니다. 저장소 `docs/`에는 진행 상황과 AI 작업 기록만 둡니다.
> 상세 폴더 구조는 [ARCHITECTURE](https://github.com/oofy-sotry/arcana/wiki/ARCHITECTURE) 9절 참조.

---

## 세계관 요약

> *태초의 근원 에너지 아르카(Arca)는 권태를 느껴 스스로를 빛과 어둠으로 분열시켰다.*  
> *플레이어는 계약자로서 그 진실을 밝히고, 세계의 균형을 되찾아야 한다.*

- **Luxis** — 빛의 군세
- **Noctis** — 어둠의 무리  
- **에레멘탈** — 10가지 속성의 생명체, 계약자의 동반자
- **옴니렉스** — 전속성을 지닌 시원적 존재, 최종 목표

자세한 스토리는 [GDD 세계관 섹션](https://github.com/oofy-sotry/arcana/wiki/GDD#3-세계관-및-스토리)을 참고하세요.
