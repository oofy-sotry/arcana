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

---

## Phase 2 — 성장 + 런처 UI

> **완료 기준:**  
> 경험치 획득 → 레벨업 → 스탯 성장  
> 진화 조건 달성 → 진화 (일반/히든/암흑)  
> 스킬 포인트로 스킬 강화  
> 런처 창에서 펫 목록/스탯/컨디션 확인 + 아이템 기본 사용

---

### 2-A DB 마이그레이션

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 65 | `feat(db): database.js runMigrations PRAGMA user_version 버전 관리 추가` | src/db/database.js | 버전 체크 후 순차 실행 (001→002→...) | ✅ |
| 66 | `feat(db): 002_growth.js pets 스탯 컬럼 추가` | src/db/migrations/002_growth.js | level, exp, skill_points, affinity, hp, mp, attack, defense, speed ALTER TABLE | ✅ |
| 67 | `feat(db): 002_growth.js pet_skills 테이블 정의` | src/db/migrations/002_growth.js | pet_id, skill_id, skill_level, unlocked_at | ✅ |
| 68 | `feat(db): 002_growth.js items 테이블 정의` | src/db/migrations/002_growth.js | item_id, name, type, effect, tradeable | ✅ |
| 69 | `feat(db): 002_growth.js pet_inventory 테이블 정의` | src/db/migrations/002_growth.js | pet_id, item_id, quantity | ✅ |
| 70 | `feat(db): 002_growth.js evolution_log 테이블 정의` | src/db/migrations/002_growth.js | pet_id, from_stage, to_stage, evo_type, evolved_at | ✅ |

---

### 2-B 게임 데이터

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 71 | `feat(data): characters.js 기본 구조 추가` | src/game/data/characters.js | 진화 트리 데이터 구조 (id, name, attribute, stage, nextId, evolveLevel, evolveAffinity) | ✅ |
| 72 | `feat(data): characters.js 불/물/바람 속성 진화 트리 추가` | src/game/data/characters.js | 플리크→인페르노스, 듀이→토렌시스, 브리지→사이클로시스 | ✅ |
| 73 | `feat(data): characters.js 땅/번개/얼음/독/드래곤 속성 진화 트리 추가` | src/game/data/characters.js | 머디→세이스모스, 스파키→뇌신로스, 스노렛→글레이시로스, 톡시→톡세모스, 드래글링→드라고렉스 | ✅ |
| 74 | `feat(data): skills.js 기본 구조 추가` | src/game/data/skills.js | 스킬 데이터 구조 (id, name, attribute, type, power, mpCost, unlockStage, coefficient) | ✅ |
| 75 | `feat(data): skills.js 불/물/바람/땅 스킬 추가` | src/game/data/skills.js | 4속성 × 액티브/패시브/버프 스킬 | ✅ |
| 76 | `feat(data): skills.js 번개/얼음/독/드래곤 스킬 추가` | src/game/data/skills.js | 나머지 4속성 스킬 | ✅ |
| 77 | `feat(data): items.js 기본 구조 추가` | src/game/data/items.js | 아이템 데이터 구조 (id, name, type, effect, maxStack, tradeable) | ✅ |
| 78 | `feat(data): items.js 소비 아이템 추가` | src/game/data/items.js | 생명의 부적, 진화의 돌, 음식, 목욕제, 에너지 물약 | ✅ |

---

### 2-C LevelSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 79 | `feat(level): LevelSystem.js 기본 구조 추가` | src/game/systems/LevelSystem.js | 클래스, DI 생성자 (Pet, save 주입) | ✅ |
| 80 | `feat(level): LevelSystem.js getExpRequired 함수 추가` | src/game/systems/LevelSystem.js | 레벨별 필요 경험치 공식 (Math.floor(level^1.5 × 100)) | ✅ |
| 81 | `feat(level): LevelSystem.js addExperience 함수 추가` | src/game/systems/LevelSystem.js | 경험치 추가, 레벨업 반복 체크, save() 호출 | ✅ |
| 82 | `feat(level): LevelSystem.js levelUp 함수 추가` | src/game/systems/LevelSystem.js | 레벨업 처리, 스킬 포인트 +1, 스탯 성장 적용 | ✅ |
| 83 | `feat(level): LevelSystem.js calcStatGrowth 함수 추가` | src/game/systems/LevelSystem.js | 성장 등급(하/중/상 = 60/30/10%) 기반 스탯 증가량 계산 | ✅ |

---

### 2-D EvolutionSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 84 | `feat(evo): EvolutionSystem.js 기본 구조 추가` | src/game/systems/EvolutionSystem.js | 클래스, DI 생성자 (Pet, save 주입) | ✅ |
| 85 | `feat(evo): EvolutionSystem.js canEvolve 함수 추가` | src/game/systems/EvolutionSystem.js | 기본 진화 조건 판정 (레벨+친화도, characters.js 참조) | ✅ |
| 86 | `feat(evo): EvolutionSystem.js evolve 함수 추가` | src/game/systems/EvolutionSystem.js | 진화 실행: evolution_stage 변경, 히든 보너스 적용, evolution_log INSERT | ✅ |
| 87 | `feat(evo): EvolutionSystem.js checkHiddenConditions 함수 추가` | src/game/systems/EvolutionSystem.js | 히든 진화 조건 A~J 체크 (characters.js hiddenConditions 참조) | ✅ |

---

### 2-E SkillSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 88 | `feat(skill): SkillSystem.js 기본 구조 추가` | src/game/systems/SkillSystem.js | 클래스, DI 생성자 (Pet, save 주입) | ✅ |
| 89 | `feat(skill): SkillSystem.js getPetSkills 함수 추가` | src/game/systems/SkillSystem.js | 펫의 해금 스킬 목록 + 강화 레벨 조회 | ✅ |
| 90 | `feat(skill): SkillSystem.js unlockSkill 함수 추가` | src/game/systems/SkillSystem.js | 진화 단계 체크 후 스킬 해금 (pet_skills INSERT) | ✅ |
| 91 | `feat(skill): SkillSystem.js upgradeSkill 함수 추가` | src/game/systems/SkillSystem.js | skill_points 소모, skill_level +1 (최대 5) | ✅ |

---

### 2-F ItemSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 92 | `feat(item): ItemSystem.js 기본 구조 추가` | src/game/systems/ItemSystem.js | 클래스, DI 생성자 (Pet, save 주입) | ✅ |
| 93 | `feat(item): ItemSystem.js addItem 함수 추가` | src/game/systems/ItemSystem.js | pet_inventory INSERT or UPDATE quantity | ✅ |
| 94 | `feat(item): ItemSystem.js getInventory 함수 추가` | src/game/systems/ItemSystem.js | 인벤토리 전체 조회 (items JOIN pet_inventory) | ✅ |
| 95 | `feat(item): ItemSystem.js useItem 함수 추가` | src/game/systems/ItemSystem.js | 아이템 효과 적용 (음식→배고픔 회복, 진화의 돌→진화 활성화 등), 수량 차감 | ✅ |

---

### 2-G GameWorld 연결 + IPC 확장

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 96 | `feat(world): gameWorld.js LevelSystem 연결` | src/main/gameWorld.js | init에 LevelSystem 주입 | ✅ |
| 97 | `feat(world): gameWorld.js EvolutionSystem 연결` | src/main/gameWorld.js | init에 EvolutionSystem 주입 | ✅ |
| 98 | `feat(world): gameWorld.js SkillSystem 연결` | src/main/gameWorld.js | init에 SkillSystem 주입 | ✅ |
| 99 | `feat(world): gameWorld.js ItemSystem 연결` | src/main/gameWorld.js | init에 ItemSystem 주입 | ✅ |
| 100 | `feat(world): gameWorld.js onTick에 진화 자동 체크 추가` | src/main/gameWorld.js | tick마다 canEvolve 체크 → 조건 충족 시 자동 진화 | ✅ |
| 101 | `feat(ipc): ipcRouter.js pet:create 핸들러 추가` | src/main/ipcRouter.js | 신규 펫 생성 (이름, 속성 지정) | ✅ |
| 102 | `feat(ipc): ipcRouter.js pet:add-exp 핸들러 추가` | src/main/ipcRouter.js | 경험치 지급 (테스트/퀘스트 보상 용도) | ✅ |
| 103 | `feat(ipc): ipcRouter.js evolution:attempt 핸들러 추가` | src/main/ipcRouter.js | 수동 진화 시도 (아이템 사용 포함) | ✅ |
| 104 | `feat(ipc): ipcRouter.js skill:get 핸들러 추가` | src/main/ipcRouter.js | 펫 스킬 목록 반환 | ✅ |
| 105 | `feat(ipc): ipcRouter.js skill:upgrade 핸들러 추가` | src/main/ipcRouter.js | 스킬 강화 실행 | ✅ |
| 106 | `feat(ipc): ipcRouter.js item:get-inventory 핸들러 추가` | src/main/ipcRouter.js | 인벤토리 조회 | ✅ |
| 107 | `feat(ipc): ipcRouter.js item:use 핸들러 추가` | src/main/ipcRouter.js | 아이템 사용 | ✅ |
| 108 | `feat(preload): preload.js 성장 시스템 API 추가` | src/preload/preload.js | pet.create, level.addExp, evolution.attempt, skill.get/upgrade, item.getInventory/use | ✅ |

---

### 2-H WindowManager 런처 + 트레이

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 109 | `feat(launcher): windowManager.js createLauncherWindow 함수 추가` | src/main/windowManager.js | 런처 BrowserWindow (800×600, 일반 창) | ✅ |
| 110 | `feat(launcher): windowManager.js createTray 함수 추가` | src/main/windowManager.js | 시스템 트레이 아이콘 + 컨텍스트 메뉴 (런처 열기, 종료) | ✅ |
| 111 | `feat(launcher): index.js Tray 연결` | src/main/index.js | whenReady에 createTray 추가, 런처 토글 등록 | ✅ |

---

### 2-I 런처 UI

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 112 | `feat(launcher): index.html 기본 구조 추가` | src/renderer/launcher/index.html | HTML 뼈대, 탭 네비게이션 (펫목록/스탯/스킬/아이템) | ✅ |
| 113 | `feat(launcher): launcher.js 기본 구조 추가` | src/renderer/launcher/launcher.js | 초기화, IPC 데이터 로드 | ✅ |
| 114 | `feat(launcher): launcher.js renderPetList 함수 추가` | src/renderer/launcher/launcher.js | 펫 카드 목록 렌더링 + 첫 실행 시 소환 버튼 | ✅ |
| 115 | `feat(launcher): PetCard.js 기본 구조 추가` | src/renderer/launcher/components/PetCard.js | 클래스 생성 | ✅ |
| 116 | `feat(launcher): PetCard.js render 함수 추가` | src/renderer/launcher/components/PetCard.js | 이름/레벨/진화 단계/컨디션 카드 DOM | ✅ |
| 117 | `feat(launcher): StatPanel.js 기본 구조 추가` | src/renderer/launcher/components/StatPanel.js | 클래스 생성 | ✅ |
| 118 | `feat(launcher): SkillTree.js 기본 구조 추가` | src/renderer/launcher/components/SkillTree.js | 클래스 생성 | ✅ |
| 119 | `feat(launcher): SkillTree.js render 함수 추가` | src/renderer/launcher/components/SkillTree.js | 해금 스킬 목록, 강화 버튼 (스킬 포인트 표시) | ✅ |
| 120 | `feat(launcher): ItemPanel.js 기본 구조 추가` | src/renderer/launcher/components/ItemPanel.js | 클래스 생성 | ✅ |
| 121 | `feat(launcher): ItemPanel.js render 함수 추가` | src/renderer/launcher/components/ItemPanel.js | 인벤토리 목록, 사용 버튼 | ✅ |

---

## 요약

| 그룹 | 커밋 수 | 내용 |
|------|--------|------|
| Phase 0 (완료) | 6 | 설계 문서, 폴더 구조 |
| Phase 1 (완료) | 60 | Core Loop 전체 |
| 2-A DB 마이그레이션 | 6 | 002_growth, 버전 관리 |
| 2-B 게임 데이터 | 8 | 캐릭터 트리, 스킬, 아이템 데이터 |
| 2-C LevelSystem | 5 | 경험치, 레벨업, 스탯 성장 |
| 2-D EvolutionSystem | 4 | 진화 조건 판정, 실행 |
| 2-E SkillSystem | 4 | 스킬 해금, 강화 |
| 2-F ItemSystem | 4 | 인벤토리, 아이템 사용 |
| 2-G GameWorld + IPC | 13 | 시스템 연결, IPC 핸들러 확장 |
| 2-H WindowManager + Tray | 3 | 런처 창, 트레이 아이콘 |
| 2-I 런처 UI | 11 | HTML, JS, 컴포넌트 4종 |
| **Phase 2 합계** | **58** | |

---

---

## Phase 3 — 사냥터 + 전투

> **완료 기준:**  
> 사냥터 창 입장/퇴장  
> 자동 모드: 에너지 소진까지 자동 전투 + 드롭 획득  
> 수동 모드: 방향키 이동, 몬스터 충돌 시 전투, ESC 도망  
> 전투 공식 (공격 × 스킬계수 − 방어 × 상성배율) 적용  
> 보물탐사 이벤트 (자동/수동)

---

### 3-A DB 마이그레이션

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 122 | `feat(db): 003_hunting.js 기본 구조 추가` | src/db/migrations/003_hunting.js | 빈 배열 파일 생성 | ✅ |
| 123 | `feat(db): 003_hunting.js pets coins 컬럼 추가` | src/db/migrations/003_hunting.js | ALTER TABLE pets ADD COLUMN coins INTEGER DEFAULT 0 | ✅ |
| 124 | `feat(db): 003_hunting.js hunt_log 테이블 정의` | src/db/migrations/003_hunting.js | pet_id, zone_id, mode, started_at, ended_at, result | ✅ |
| 125 | `feat(db): 003_hunting.js drop_log 테이블 정의` | src/db/migrations/003_hunting.js | pet_id, hunt_log_id, item_id, quantity, coins, dropped_at | ✅ |
| 126 | `feat(db): database.js runMigrations에 003_hunting 추가` | src/db/database.js | MIGRATIONS 배열에 003 포함 | ✅ |

---

### 3-B 게임 데이터

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 127 | `feat(data): attributes.js 기본 구조 추가` | src/game/data/attributes.js | 속성 ID 목록, 상성 차트 (10×10 matrix) | ✅ |
| 128 | `feat(data): monsters.js 기본 구조 추가` | src/game/data/monsters.js | 몬스터 데이터 구조 (id, name, attribute, hp, attack, defense, exp, zone) | ✅ |
| 129 | `feat(data): monsters.js 불/물/바람/땅 속성 몬스터 추가` | src/game/data/monsters.js | 4속성 × 난이도 3단계 = 12종 | ✅ |
| 130 | `feat(data): monsters.js 번개/얼음/독/드래곤 속성 몬스터 추가` | src/game/data/monsters.js | 나머지 4속성 12종 | ✅ |
| 131 | `feat(data): monsters.js 드롭 테이블 추가` | src/game/data/monsters.js | 몬스터별 드롭 아이템 목록 + 확률 | ✅ |
| 132 | `feat(data): monsters.js 사냥터 구역(zone) 정의 추가` | src/game/data/monsters.js | ZONES: 입문/일반/고급 3구역, 권장 레벨, 스폰 몬스터 목록 | ✅ |

---

### 3-C 전투 수식

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 133 | `feat(combat): formula.js 기본 구조 추가` | src/game/utils/formula.js | 파일 생성, 상수 정의 | ✅ |
| 134 | `feat(combat): formula.js calcDamage 함수 추가` | src/game/utils/formula.js | max(1, 공격×계수 − 방어) × 상성 × 크리티컬 | ✅ |
| 135 | `feat(combat): formula.js calcCritical 함수 추가` | src/game/utils/formula.js | 기본 10% + 상성유리 시 +15%, 1.5배 | ✅ |
| 136 | `feat(combat): formula.js getAttributeMultiplier 함수 추가` | src/game/utils/formula.js | attributes.js 상성 차트 참조 → 1.3/1.0/0.77 | ✅ |

---

### 3-D CombatSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 137 | `feat(combat): CombatSystem.js 기본 구조 추가` | src/game/systems/CombatSystem.js | 클래스, DI 생성자 | ✅ |
| 138 | `feat(combat): CombatSystem.js startBattle 함수 추가` | src/game/systems/CombatSystem.js | 전투 상태 초기화 (pet vs monster) | ✅ |
| 139 | `feat(combat): CombatSystem.js executePetTurn 함수 추가` | src/game/systems/CombatSystem.js | 펫 공격 (스킬 선택 + 데미지 계산) | ✅ |
| 140 | `feat(combat): CombatSystem.js executeMonsterTurn 함수 추가` | src/game/systems/CombatSystem.js | 몬스터 공격 (기본 공격) | ✅ |
| 141 | `feat(combat): CombatSystem.js checkBattleEnd 함수 추가` | src/game/systems/CombatSystem.js | HP 0 체크 → 승/패/도망 판정 | ✅ |
| 142 | `feat(combat): CombatSystem.js endBattle 함수 추가` | src/game/systems/CombatSystem.js | 승리: exp/코인/드롭 지급, 패배: 사망 처리 | ✅ |

---

### 3-E HuntingSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 143 | `feat(hunt): HuntingSystem.js 기본 구조 추가` | src/game/systems/HuntingSystem.js | 클래스, DI 생성자 | ✅ |
| 144 | `feat(hunt): HuntingSystem.js getZones 함수 추가` | src/game/systems/HuntingSystem.js | 접근 가능 구역 목록 반환 | ✅ |
| 145 | `feat(hunt): HuntingSystem.js spawnMonster 함수 추가` | src/game/systems/HuntingSystem.js | zone 기반 랜덤 몬스터 선택 | ✅ |
| 146 | `feat(hunt): HuntingSystem.js startAutoHunt 함수 추가` | src/game/systems/HuntingSystem.js | 에너지 -30/전투, 자동 반복 배틀 루프 | ✅ |
| 147 | `feat(hunt): HuntingSystem.js stopAutoHunt 함수 추가` | src/game/systems/HuntingSystem.js | 자동 사냥 중단, hunt_log 저장 | ✅ |
| 148 | `feat(hunt): HuntingSystem.js processManualBattle 함수 추가` | src/game/systems/HuntingSystem.js | 에너지 -15/전투, 드롭률 +20% | ✅ |

---

### 3-F ExplorationSystem

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 149 | `feat(hunt): ExplorationSystem.js 기본 구조 추가` | src/game/systems/ExplorationSystem.js | 클래스, DI 생성자 | ✅ |
| 150 | `feat(hunt): ExplorationSystem.js startAutoExplore 함수 추가` | src/game/systems/ExplorationSystem.js | 에너지 -25, 드롭 1~5% | ✅ |
| 151 | `feat(hunt): ExplorationSystem.js rollEvent 함수 추가` | src/game/systems/ExplorationSystem.js | 랜덤 이벤트 테이블 (아이템/코인/罠/빈칸) | ✅ |
| 152 | `feat(hunt): ExplorationSystem.js manualExplore 함수 추가` | src/game/systems/ExplorationSystem.js | 에너지 -13, 드롭 2~10%, 특수 이벤트 확률 상승 | ✅ |

---

### 3-G GameWorld 연결 + IPC

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 153 | `feat(world): gameWorld.js CombatSystem 연결` | src/main/gameWorld.js | init에 CombatSystem 주입 | ✅ |
| 154 | `feat(world): gameWorld.js HuntingSystem 연결` | src/main/gameWorld.js | init에 HuntingSystem 주입 | ✅ |
| 155 | `feat(world): gameWorld.js ExplorationSystem 연결` | src/main/gameWorld.js | init에 ExplorationSystem 주입 | ✅ |
| 156 | `feat(world): gameWorld.js onTick 에너지 자동 회복 추가` | src/main/gameWorld.js | +10/hour = +약 0.167/tick, pet_conditions energy 갱신 | ✅ |
| 157 | `feat(world): gameWorld.js onTick 오프라인 자동 사냥 처리` | src/main/gameWorld.js | applyOfflineProgress에 에너지 기반 자동 사냥 누적 반영 | ✅ |
| 158 | `feat(ipc): ipcRouter.js hunting:get-zones 핸들러 추가` | src/main/ipcRouter.js | 구역 목록 반환 | ✅ |
| 159 | `feat(ipc): ipcRouter.js hunting:start-auto 핸들러 추가` | src/main/ipcRouter.js | 자동 사냥 시작 | ✅ |
| 160 | `feat(ipc): ipcRouter.js hunting:stop-auto 핸들러 추가` | src/main/ipcRouter.js | 자동 사냥 중단 | ✅ |
| 161 | `feat(ipc): ipcRouter.js hunting:manual-battle 핸들러 추가` | src/main/ipcRouter.js | 수동 전투 1회 실행 | ✅ |
| 162 | `feat(ipc): ipcRouter.js hunting:explore 핸들러 추가` | src/main/ipcRouter.js | 탐사 1회 실행 (자동/수동 구분) | ✅ |
| 163 | `feat(ipc): ipcRouter.js hunting:open 핸들러 추가` | src/main/ipcRouter.js | 사냥터 창 열기 | ✅ |
| 164 | `feat(preload): preload.js 사냥 API 추가` | src/preload/preload.js | hunting.getZones/startAuto/stopAuto/manualBattle/explore/open | ✅ |

---

### 3-H 사냥터 창

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 165 | `feat(window): windowManager.js createHuntingWindow 함수 추가` | src/main/windowManager.js | 사냥터 BrowserWindow (1024×768) | ✅ |
| 166 | `feat(window): index.js HuntingWindow 연결` | src/main/index.js | IPC hunting:open → createHuntingWindow | ✅ |

---

### 3-I 사냥터 렌더러

| # | 커밋 메시지 | 파일 | 변경 내용 | 완료 |
|---|------------|------|----------|------|
| 167 | `feat(hunting): index.html 기본 구조 추가` | src/renderer/hunting/index.html | HTML 뼈대, 모드 토글 버튼 | ✅ |
| 168 | `feat(hunting): hunting.js PixiJS 씬 초기화` | src/renderer/hunting/hunting.js | Application 생성, 배경 타일 | ✅ |
| 169 | `feat(hunting): hunting.js 펫 스프라이트 배치` | src/renderer/hunting/hunting.js | 초기 펫 위치 + 스프라이트 로드 | ✅ |
| 170 | `feat(hunting): hunting.js 키보드 이동 추가` | src/renderer/hunting/hunting.js | 방향키/WASD 이동, ESC 도망 | ✅ |
| 171 | `feat(hunting): hunting.js 충돌 감지 추가` | src/renderer/hunting/hunting.js | 펫-몬스터 AABB 충돌 → 전투 트리거 | ✅ |
| 172 | `feat(hunting): monsterRenderer.js 기본 구조 추가` | src/renderer/hunting/monsterRenderer.js | 클래스, 스테이지 참조 | ✅ |
| 173 | `feat(hunting): monsterRenderer.js spawnMonster 함수 추가` | src/renderer/hunting/monsterRenderer.js | 랜덤 위치에 몬스터 스프라이트 생성 | ✅ |
| 174 | `feat(hunting): monsterRenderer.js removeMonster 함수 추가` | src/renderer/hunting/monsterRenderer.js | 전투 후 몬스터 제거 + 리스폰 타이머 | ✅ |
| 175 | `feat(hunting): combatUI.js 기본 구조 추가` | src/renderer/hunting/combatUI.js | 클래스, UI 컨테이너 | ✅ |
| 176 | `feat(hunting): combatUI.js HP바 렌더링` | src/renderer/hunting/combatUI.js | 펫/몬스터 HP 게이지 | ✅ |
| 177 | `feat(hunting): combatUI.js 전투 버튼 추가` | src/renderer/hunting/combatUI.js | 공격/도망 버튼, 자동/수동 모드 토글 | ✅ |

---

## 요약

| 그룹 | 커밋 수 | 내용 |
|------|--------|------|
| Phase 0 (완료) | 6 | 설계 문서, 폴더 구조 |
| Phase 1 (완료) | 60 | Core Loop 전체 |
| Phase 2 (완료) | 58 | 성장+런처 전체 |
| Phase 3 (완료) | 57+ | 사냥터+전투 전체 |
| 3-A DB 마이그레이션 | 5 | 003_hunting, coins/log 테이블 |
| 3-B 게임 데이터 | 6 | attributes 상성, monsters 24종+드롭+구역 |
| 3-C 전투 수식 | 4 | formula.js 데미지/크리티컬/상성 |
| 3-D CombatSystem | 6 | 턴 기반 전투 로직 |
| 3-E HuntingSystem | 6 | 자동/수동 사냥, 드롭 처리 |
| 3-F ExplorationSystem | 4 | 자동/수동 탐사, 랜덤 이벤트 |
| 3-G GameWorld + IPC | 12 | 시스템 연결, 에너지 회복, IPC 핸들러 |
| 3-H 사냥터 창 | 2 | HuntingWindow, 연결 |
| 3-I 사냥터 렌더러 | 11 | PixiJS 씬, 이동, 충돌, 전투UI |
| **Phase 3 합계** | **56** | |

---

## 다음 Phase (예고)

- **Phase 4** — 수집 + 교배: 계보, 혼합속성
- **Phase 5** — 스토리 + 퀘스트
- **Phase 6** — 온라인
