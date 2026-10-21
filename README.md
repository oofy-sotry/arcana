# 아르카나 (Arcana)

> 데스크톱 위를 돌아다니는 에레멘탈과 함께하는 육성 수집 RPG

---

## 프로젝트 소개

**아르카나**는 Electron 기반 데스크톱 펫 게임입니다.  
펫(에레멘탈)이 실제 바탕화면 위를 돌아다니며, 플레이어는 계약자로서 에레멘탈과 계약하고 함께 성장합니다.

몬스터 육성·수집 장르의 오리지널 세계관을 배경으로,  
육성 / 진화 / 수집 / 교배를 통해 전설의 에레멘탈 **옴니렉스**를 향해 나아갑니다.

---

## 기술 구조

### 프로세스 구조

```
┌──────────────────────── Main 프로세스 (Node.js) ────────────────────────┐
│ GameWorld      게임 시스템 21개 생성·DI, 60초 tick(컨디션·나이·에너지)  │
│                sql.js(WebAssembly SQLite) 저장 + 마이그레이션 17개      │
│ IpcRouter      ipcMain 채널 93개를 한 파일에서 등록                      │
│ WindowManager  투명 오버레이 창 · 런처 창 · 트레이                       │
│ ApiService     서버 REST 호출 (HTTP, JWT)                                │
│ logger         파일 로그 + 에러는 서버 /client-log로 전송                │
└──────────────▲──────────────────────────────────────────▲───────────────┘
               │ IPC (invoke / send)                       │ HTTP
┌──────────────┴──────────────┐                 ┌──────────┴──────────────┐
│ Preload                     │                 │ server/ (Express + ws)  │
│ contextBridge로             │                 │ JWT 인증 · 세이브 ·     │
│ window.arcana.* 만 노출     │                 │ 랭킹 · 교배 · 친구 ·    │
└──────────────▲──────────────┘                 │ 실시간 매칭 큐          │
               │                                └──────────▲──────────────┘
┌──────────────┴──────────────────────────────────┐        │ WebSocket
│ Renderer                                         ├────────┘ (실시간 PvP·파티 사냥)
│ 오버레이: PixiJS — 바탕화면 위를 걷는 펫          │
│ 런처/월드맵: Canvas 2D + DOM 패널                 │
│ 사냥(턴제 전투): PixiJS — 런처 창 안에서 화면 전환 │
└──────────────────────────────────────────────────┘
```

게임 상태를 바꾸는 로직은 모두 main 프로세스의 `src/game/systems`에 있고, renderer는 화면 표시와 입력만 담당합니다.

### 보안 설정

- 모든 `BrowserWindow`는 `contextIsolation: true`, `nodeIntegration: false` (`src/main/windowManager.js`).
  renderer에서 Node API(`fs`, `child_process` 등)를 쓸 수 없으므로, 화면 코드에 문제가 생겨도 파일 시스템·DB에 직접 접근하지 못합니다.
- preload는 `ipcRenderer`를 그대로 노출하지 않고, 기능별 함수(`window.arcana.pet.getAll()` 등)만 `contextBridge`로 노출합니다.
  renderer가 호출할 수 있는 채널이 preload에 적힌 목록으로 제한됩니다.
- 각 화면 HTML에 Content-Security-Policy를 둬서 외부 스크립트 로드를 막습니다(`script-src 'self'`).
  PixiJS를 쓰는 오버레이·사냥 화면만 PixiJS 내부 동작 때문에 `'unsafe-eval'`과 `worker-src blob:`을 허용합니다.

### IPC 설계

- 채널 이름은 `도메인:동작` 형식(`pet:get-all`, `hunting:manual-battle`, `online:login` …)이고, 전부 `src/main/ipcRouter.js` 한 곳에서 등록합니다.
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

`server/`는 Express REST API(`/auth`, `/save`, `/ranking`, `/breeding`, `/battle`, `/friends`, `/client-log`)와
같은 HTTP 서버에 붙은 WebSocket(`ws`)으로 구성됩니다. 인증은 bcrypt 해시 + JWT, 저장소는 sql.js입니다.
실시간 PvP·파티 사냥은 서버 메모리의 매칭 큐(`server/realtime/queue.js`, `partyQueue.js`, `huntMatch.js`)로 짝을 맞춥니다.
서버가 없어도 싱글플레이는 전부 동작하고, 온라인 탭만 연결 실패로 표시됩니다.

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
| 언어 | JavaScript (CommonJS, Main/DB/Game 레이어 — 프리로드 contextBridge) |
| 렌더링 | PixiJS v8 (ES 모듈) |
| 저장소 (클라이언트) | sql.js (WebAssembly SQLite) |
| 저장소 (서버) | sql.js — `server/` Express 앱 |
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
├── src/                 # Electron 클라이언트 (main/game/db/renderer/preload)
├── server/              # 온라인 기능 서버 (Express + sql.js)
├── assets/
│   ├── sprites/         # 캐릭터 스프라이트 — 아직 미제작 (.gitkeep만 존재)
│   ├── ui/               # UI 에셋 — 아직 미제작
│   ├── audio/            # 사운드 — 아직 미제작
│   └── items/             # 아이템 이미지 — 아직 미제작
└── README.md
```

> 설계 문서는 [Wiki](https://github.com/oofy-sotry/arcana/wiki)에 있습니다 (저장소에는 더 이상 `docs/` 폴더가 없습니다).
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
