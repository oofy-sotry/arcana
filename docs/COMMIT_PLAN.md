# 아르카나 커밋 계획

> 개발 체크리스트. 하나 완료할 때마다 `[x]`로 표시.  
> 순서대로 진행. 앞 단계가 완료되어야 다음 단계 진행.

---

## Phase 0 — 기반 설계 ✅

| # | 커밋 메시지 | 파일 | 완료 |
|---|------------|------|------|
| 1 | `feat: 프로젝트 리셋 — 아르카나 GDD v1.0` | GDD.md | ✅ |
| 2 | `docs: README 작성 + 저장소 이름 arcana로 변경` | README.md | ✅ |
| 3 | `docs: 아르카나 아키텍처 설계서 작성` | ARCHITECTURE.md | ✅ |
| 4 | `chore: 프로젝트 폴더 구조 설정` | src/ 전체 | ✅ |
| 5 | `docs: 커밋 규칙 문서 작성` | COMMIT_RULES.md | ✅ |
| 6 | `docs: 개발 커밋 계획 작성` | COMMIT_PLAN.md | ✅ |

---

## Phase 1 — Core Loop

> **완료 기준:** 앱 실행 시 펫이 바탕화면 위를 걸어다니고, 시간이 지나면 컨디션이 줄어든다.

---

### 1-A 환경 설정

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 7 | `chore: .gitignore 설정` | .gitignore | node_modules, dist, *.db, .env 제외 | ✅ |
| 8 | `chore: package.json 기본 설정` | package.json | name, version, main 진입점 | ✅ |
| 9 | `chore: package.json Electron 의존성 추가` | package.json | electron, electron-builder | ✅ |
| 10 | `chore: package.json PixiJS 의존성 추가` | package.json | pixi.js | ✅ |
| 11 | `chore: package.json sql.js 의존성 추가` | package.json | ~~better-sqlite3~~ → sql.js (경로 공백 node-gyp 빌드 오류로 교체) | ✅ |
| 12 | `chore: package.json 실행 스크립트 추가` | package.json | start, build 스크립트 | ✅ |
| 12-1 | `chore: package.json electron-builder WASM 번들 설정 추가` | package.json | extraResources에 sql-wasm.wasm 포함 (미설정 시 패키징 후 DB 초기화 실패) | ✅ |

---

### 1-B 데이터베이스

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 13 | `feat(db): database.js 기본 구조 추가` | src/db/database.js | sql.js 초기화, DB 파일 경로 설정 | ✅ |
| 14 | `feat(db): database.js init 함수 추가` | src/db/database.js | `init()` — 파일 로드 or 신규 생성 (async) | ✅ |
| 14-1 | `feat(db): database.js save 함수 추가` | src/db/database.js | `save()` — db.export() → 파일 플러시 | ✅ |
| 14-2 | `feat(db): database.js query / run 헬퍼 추가` | src/db/database.js | `query(sql,params)` — prepare→bind→step→free 래퍼, `run(sql,params)` — INSERT/UPDATE/DELETE 래퍼 | ✅ |
| 15 | `feat(db): 001_init.js world_state 테이블 정의` | src/db/migrations/001_init.js | world_state 스키마 | ✅ |
| 16 | `feat(db): 001_init.js pets 테이블 정의` | src/db/migrations/001_init.js | pets 스키마 (id, uuid, name, attribute TEXT, level, age, evolution_stage...) | ✅ |
| 17 | `feat(db): 001_init.js pet_conditions 테이블 정의` | src/db/migrations/001_init.js | pet_conditions 스키마 (hunger, happiness, energy...) | ✅ |
| 18 | `feat(db): database.js runMigrations 함수 추가` | src/db/database.js | `runMigrations()` — 001_init.js 실행 | ✅ |
| 19 | `feat(db): World.js 기본 구조 추가` | src/db/models/World.js | 파일 생성, 모듈 구조 | ✅ |
| 20 | `feat(db): World.js get 함수 추가` | src/db/models/World.js | `get(key)` — world_state 조회 | ✅ |
| 21 | `feat(db): World.js set 함수 추가` | src/db/models/World.js | `set(key, value)` — world_state 저장 | ✅ |
| 22 | `feat(db): Pet.js 기본 구조 추가` | src/db/models/Pet.js | 파일 생성, 모듈 구조 | ✅ |
| 23 | `feat(db): Pet.js createPet 함수 추가` | src/db/models/Pet.js | INSERT — 펫 생성 | ✅ |
| 24 | `feat(db): Pet.js getPet 함수 추가` | src/db/models/Pet.js | SELECT — 단일 펫 조회 | ✅ |
| 25 | `feat(db): Pet.js getAllPets 함수 추가` | src/db/models/Pet.js | SELECT — 전체 펫 목록 | ✅ |
| 26 | `feat(db): Pet.js updatePet 함수 추가` | src/db/models/Pet.js | UPDATE — 펫 스탯 저장 | ✅ |
| 27 | `feat(db): Pet.js getConditions 함수 추가` | src/db/models/Pet.js | SELECT — 컨디션 조회 | ✅ |
| 28 | `feat(db): Pet.js updateConditions 함수 추가` | src/db/models/Pet.js | UPDATE — 컨디션 저장 | ✅ |
| 28-1 | `feat(db): Item.js 기본 구조 추가` | src/db/models/Item.js | 파일 생성 (tradeable 플래그 포함) | ✅ |

---

### 1-C 게임 유틸

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 29 | `feat(pet): time.js 기본 구조 추가` | src/game/utils/time.js | 파일 생성 | ✅ |
| 30 | `feat(pet): time.js getElapsedSeconds 함수 추가` | src/game/utils/time.js | 두 타임스탬프 사이 경과 초 계산 | ✅ |
| 31 | `feat(pet): time.js secondsToAge 함수 추가` | src/game/utils/time.js | 초 → 나이 변환 (43200초 = 1살) | ✅ |
| 32 | `feat(pet): time.js calcOfflineTicks 함수 추가` | src/game/utils/time.js | 오프라인 경과 시간 → tick 횟수 변환 | ✅ |

---

### 1-D PetSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 33 | `feat(pet): PetSystem.js 기본 구조 추가` | src/game/systems/PetSystem.js | 클래스 생성, 생성자 | ✅ |
| 34 | `feat(pet): PetSystem.js createPet 함수 추가` | src/game/systems/PetSystem.js | 신규 펫 생성 (기본값 설정 + DB INSERT + 즉시 save()) | ✅ |
| 35 | `feat(pet): PetSystem.js getAll 함수 추가` | src/game/systems/PetSystem.js | 전체 펫 + 컨디션 조회 | ✅ |
| 36 | `feat(pet): PetSystem.js tickConditions 함수 추가` | src/game/systems/PetSystem.js | 60초마다 컨디션 감소 계산 | ✅ |
| 37 | `feat(pet): PetSystem.js tickAge 함수 추가` | src/game/systems/PetSystem.js | 나이 증가 체크 (43200초 단위) | ✅ |
| 38 | `feat(pet): PetSystem.js applyOfflineProgress 함수 추가` | src/game/systems/PetSystem.js | 오프라인 경과분 일괄 반영 | ✅ |

---

### 1-E GameWorld (게임 루프)

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 39 | `feat(world): gameWorld.js 기본 구조 추가` | src/main/gameWorld.js | 클래스 생성, 시스템 주입 | ✅ |
| 40 | `feat(world): gameWorld.js init 함수 추가` | src/main/gameWorld.js | **async** — await db.init(), 오프라인 진행 처리 | ✅ |
| 41 | `feat(world): gameWorld.js startTick 함수 추가` | src/main/gameWorld.js | 60초 setInterval 루프 | ✅ |
| 42 | `feat(world): gameWorld.js onTick 함수 추가` | src/main/gameWorld.js | tick 1회 실행 (컨디션 → 나이 → 저장) | ✅ |
| 43 | `feat(world): gameWorld.js shutdown 함수 추가` | src/main/gameWorld.js | 종료 전 강제 저장 | ✅ |

---

### 1-F 창 관리 + IPC

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 44 | `feat(window): windowManager.js 기본 구조 추가` | src/main/windowManager.js | 클래스 생성 | ✅ |
| 45 | `feat(window): windowManager.js createOverlayWindow 함수 추가` | src/main/windowManager.js | 투명 전체화면 창 생성 옵션 | ✅ |
| 46 | `feat(window): windowManager.js toggleMouseEvents 함수 추가` | src/main/windowManager.js | 마우스 클릭 투과 토글 | ✅ |
| 47 | `feat(ipc): ipcRouter.js 기본 구조 추가` | src/main/ipcRouter.js | 라우터 초기화 구조 | ✅ |
| 48 | `feat(ipc): ipcRouter.js pet:get-all 핸들러 추가` | src/main/ipcRouter.js | 전체 펫 목록 반환 | ✅ |
| 49 | `feat(ipc): ipcRouter.js overlay:toggle-mouse 핸들러 추가` | src/main/ipcRouter.js | 오버레이 마우스 투과 토글 | ✅ |
| 50 | `feat(preload): preload.js contextBridge 기본 구조 추가` | src/preload/preload.js | ipcRenderer 노출 기반 구조 | ✅ |
| 51 | `feat(preload): preload.js pet API 노출 추가` | src/preload/preload.js | window.arcana.pet.getAll 등 | ✅ |
| 52 | `feat(window): index.js 기본 구조 추가` | src/main/index.js | app.whenReady 진입점 | ✅ |
| 53 | `feat(window): index.js GameWorld 연결` | src/main/index.js | **await** gameWorld.init() 후 tick 시작 (async 체인) | ✅ |
| 54 | `feat(window): index.js WindowManager 연결` | src/main/index.js | 오버레이 창 생성 | ✅ |
| 55 | `feat(window): index.js IpcRouter 연결` | src/main/index.js | 핸들러 등록 | ✅ |
| 56 | `feat(window): index.js 종료 이벤트 처리` | src/main/index.js | before-quit → shutdown | ✅ |

---

### 1-G 오버레이 렌더러

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 57 | `feat(overlay): index.html 기본 구조 추가` | src/renderer/overlay/index.html | HTML 뼈대, PixiJS 로드 | ✅ |
| 58 | `feat(overlay): overlay.js PixiJS 앱 초기화` | src/renderer/overlay/overlay.js | Application 생성, 전체화면 설정 | ✅ |
| 59 | `feat(overlay): overlay.js 펫 데이터 로드` | src/renderer/overlay/overlay.js | IPC pet:get-all 호출 → 렌더러 초기화 | ✅ |
| 60 | `feat(overlay): petRenderer.js 기본 구조 추가` | src/renderer/overlay/petRenderer.js | 클래스 생성 | ✅ |
| 61 | `feat(overlay): petRenderer.js loadSprite 함수 추가` | src/renderer/overlay/petRenderer.js | PNG 로드 → PixiJS Sprite 생성 | ✅ |
| 62 | `feat(overlay): petRenderer.js addPet 함수 추가` | src/renderer/overlay/petRenderer.js | 스테이지에 펫 스프라이트 추가 | ✅ |
| 63 | `feat(overlay): petRenderer.js moveRandom 함수 추가` | src/renderer/overlay/petRenderer.js | 랜덤 방향 이동 (ticker) | ✅ |
| 64 | `feat(overlay): petRenderer.js 마우스 오버 감지 추가` | src/renderer/overlay/petRenderer.js | pointerover → IPC toggle-mouse | ✅ |

---

## 요약

| 그룹 | 커밋 수 | 내용 |
|------|--------|------|
| Phase 0 (완료) | 6 | 설계 문서, 폴더 구조 |
| 1-A 환경 설정 | 7 | .gitignore, package.json (WASM 설정 포함) |
| 1-B 데이터베이스 | 18 | sql.js, 모델, 마이그레이션, 헬퍼 함수 |
| 1-C 게임 유틸 | 4 | 시간 계산 유틸 |
| 1-D PetSystem | 6 | 핵심 게임 로직 |
| 1-E GameWorld | 5 | 60초 루프 |
| 1-F 창 + IPC | 13 | 창 관리, IPC 라우터 |
| 1-G 오버레이 | 8 | PixiJS 렌더링 |
| **Phase 1 합계** | **60** | |

---

## 다음 Phase (예고)

- **Phase 2** — 성장 + 진화: 레벨업, 진화 트리거, 스킬 해금
- **Phase 3** — 사냥터: 전투, 수동/자동, 드롭
- **Phase 4** — 수집 + 교배: 계보, 혼합속성
- **Phase 5** — 스토리 + 퀘스트
- **Phase 6** — 온라인
