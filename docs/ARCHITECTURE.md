# 아르카나 아키텍처 설계서

> GDD 기반 구현 청사진. 모든 기술 결정의 기준 문서입니다.

---

## 1. 기술 스택

| 항목 | 기술 | 선택 이유 |
|------|------|----------|
| 플랫폼 | Electron | 투명 바탕화면 오버레이 구현 가능한 유일한 선택 |
| 언어 | JavaScript (ES Modules) | Electron 네이티브, 충분한 성능 |
| 렌더링 | PixiJS (WebGL) | GPU 가속 스프라이트 렌더링, 펫 다수 처리 최적 |
| 데이터베이스 | SQLite (sql.js) | 펫 계보·교배·아이템 등 관계형 데이터 필수. WebAssembly 기반으로 컴파일 불필요 |
| UI (허브) | Vanilla JS + CSS | 무거운 프레임워크 불필요, 직접 제어 |

---

## 2. 핵심 아키텍처 결정

### 결정 1 — 단일 데스크톱 오버레이

```
❌ 이전 방식: 펫마다 개별 창 → 펫 100마리 = 창 100개
✅ 아르카나:  단일 투명 전체화면 창에 모든 펫 + 주인공 렌더링 (PixiJS)
```

### 결정 2 — 게임 로직 / 렌더링 완전 분리

```
Main Process  → 모든 게임 로직, 상태 관리, DB 접근
Renderer      → 화면 표시 + 사용자 입력 전달만
IPC           → 두 프로세스의 유일한 통신 수단
```

이 분리 덕분에 어떤 창이 열려있든 게임 루프는 Main에서 계속 돌아갑니다.

### 결정 3 — 오프라인 진행 처리

```
앱 종료 시: 타임스탬프 DB 저장
앱 실행 시: 경과 시간 계산 → 나이/컨디션 일괄 반영
게임 루프:  60초 tick (컨디션 감소, 알림 체크, 자동저장)
```

---

## 3. 프로세스 구조

```
┌─────────────────────────────────────────────────────┐
│                 Electron Main Process                │
│                                                     │
│  GameWorld ──── 게임 루프 (60초 tick) + 상태 관리   │
│  │                                                  │
│  ├── PetSystem          ← 나이, 레벨, 컨디션       │
│  ├── EvolutionSystem    ← 진화 트리거 + 조건 판정  │
│  ├── CombatSystem       ← 전투 공식, 스킬 처리     │
│  ├── BreedingSystem     ← 교배 확률, 계보 기록     │
│  ├── HuntingSystem      ← 사냥터, 드롭, 몬스터     │
│  ├── ExplorationSystem  ← 보물탐사, 이벤트         │
│  ├── QuestSystem        ← 퀘스트 진행, 보상        │
│  ├── EconomySystem      ← 코인, 가챠, 상점         │
│  ├── PartySystem        ← 파티 구성, 포메이션 시너지│
│  ├── ItemSystem         ← 인벤토리, 부적 강화      │
│  ├── StorySystem        ← 챕터, 선택지, 영혼동화도  │
│  └── NotificationSystem ← 알림 조건, OS 알림 발송  │
│                                                     │
│  DatabaseManager  ← SQLite 단일 연결               │
│  WindowManager    ← 창 생성/관리/상태              │
│  IPCRouter        ← 모든 IPC 요청 라우팅           │
└──────────────────┬──────────────────────────────────┘
                   │ IPC (이벤트 버스)
      ┌────────────┼────────────┬──────────────┐
      ▼            ▼            ▼              ▼
 ┌─────────┐ ┌──────────┐ ┌─────────┐  ┌──────────┐
 │오버레이  │ │런처/허브  │ │사냥터   │  │상태팝업  │
 │투명 전체 │ │관리 허브  │ │전투 창  │  │소형 플로팅│
 │화면 창  │ │컬렉션/상점│ │키보드   │  │         │
 │PixiJS   │ │교배/스킬  │ │방향키   │  │         │
 └─────────┘ └──────────┘ └─────────┘  └──────────┘
```

---

## 4. 창(Window) 구조

### 데스크톱 오버레이 창 (항시 실행)
```javascript
{
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  fullscreen: true,
  skipTaskbar: true,
  focusable: false       // 기본: 클릭 투과
}
// 펫/주인공 위에 마우스 올리면 → main에 IPC → setIgnoreMouseEvents(false)
// 마우스 벗어나면 → setIgnoreMouseEvents(true, { forward: true })
```
역할: 주인공 아바타 + 모든 파티·로밍 펫 PixiJS 렌더링

### 런처/허브 창 (필요 시 열림)
- 일반 창, 항상 열려있을 필요 없음
- 역할: 컬렉션, 퀘스트, 상점, 교배, 스킬트리, 파티 구성

### 사냥터 창 (입장 시 열림 → 퇴장 시 닫힘)
- 키보드 방향키 입력 독점
- PixiJS 씬 별도 구성
- 역할: 수동/자동 사냥, 보물탐사

### 상태 팝업 (펫 클릭 시 생성)
- 작은 플로팅 창, 펫마다 독립 생성
- 역할: 컨디션 표시, 빠른 돌봄, 파티 편입 버튼

---

## 5. 데이터 아키텍처 (SQLite)

### 핵심 테이블 구조

```sql
-- 펫
pets              (id, uuid, name, species_id, attribute, evolution_stage, level, age, ...)
pet_stats         (pet_id, attack, defense, speed, hp, magic, ...)
pet_conditions    (pet_id, hunger, happiness, cleanliness, energy, last_updated)
pet_skills        (pet_id, skill_id, level, skill_points_used)
pet_affinities    (pet_id, target_id, type[player|pet], value)  -- 친화도/신뢰도 분리
pet_evolution_log (pet_id, from_stage, to_stage, type, timestamp)

-- 교배 / 계보
breeding_records  (id, parent1_id, parent2_id, result_id, timestamp)
genealogy         (pet_id, parent1_id, parent2_id, generation)

-- 아이템
items             (id, pet_id, item_type, quantity)
item_enhancements (item_id, slot, enhancement_level, break_count)

-- 스토리 / 퀘스트
quests            (id, quest_id, status, progress, completed_at)
story_flags       (flag_key, value, updated_at)
soul_fusion       (pet_id, gauge, threshold)

-- 플레이어 / 세계
contractor        (id, name, appearance, level, experience)
world_state       (key, value)  -- coins, last_save, etc.
```

### 저장 규칙
- **메모리 DB**: sql.js는 DB를 메모리에 로드해서 사용 (쿼리는 동기)
- **자동저장**: 60초 tick마다 `db.export()` → 파일로 플러시
- **종료 저장**: app.on('before-quit') 훅에서 강제 플러시
- **시작 로드**: `fs.readFileSync(dbPath)` → `new SQL.Database(buffer)`

---

## 6. 게임 루프

```
앱 시작
  └─ DB에서 last_save 읽기
  └─ 경과 시간 = now - last_save
  └─ 오프라인 진행 일괄 처리
      ├─ 나이 += 경과시간 / 12h
      ├─ 컨디션 -= 경과시간 × 감소율
      ├─ 자동사냥 결과 계산 (에너지 소진까지)
      └─ 자연사 체크

60초 tick (setInterval - Main Process)
  ├─ 컨디션 감소 (-0.025%/tick ≈ -1.5%/h)
  ├─ 나이 체크 (12h 경과 시 +1살, 자연사 확률 적용)
  ├─ 자동사냥 진행 (에너지 있으면)
  ├─ 알림 조건 체크 (배고픔/행복도 임계값)
  ├─ DB 자동저장
  └─ 렌더러에 상태 푸시

1초 tick (PixiJS ticker - Renderer)
  ├─ 펫/주인공 이동 애니메이션
  └─ 사냥터: 전투 애니메이션, 몬스터 AI
```

---

## 7. IPC 통신 규칙

### 명명 규칙
```
[시스템]:[액션]

예)
  pet:get-all           → 전체 펫 조회
  pet:feed              → 먹이 주기
  pet:get-status        → 특정 펫 상태
  evolution:attempt     → 진화 시도
  hunt:enter            → 사냥터 입장
  hunt:manual-action    → 수동 사냥 조작
  breed:request         → 교배 신청
  item:enhance          → 아이템 강화
  story:choice          → 스토리 선택지
  notify:push           → 알림 발송
  overlay:toggle-mouse  → 마우스 투과 토글
```

### 방향성
```
Renderer → Main: ipcRenderer.invoke('pet:feed', { petId, amount })
                 await로 응답 대기 (요청/응답 패턴)

Main → Renderer: webContents.send('pet:state-update', petData)
                 단방향 상태 푸시 (60초 tick, 이벤트 발생)
```

---

## 8. 모듈 의존성 흐름

```
[Renderer] → IPC → [IPCRouter]
                        │
                        ▼
                  [GameWorld]  ← tick loop
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         [Systems]          [DatabaseManager]
    (PetSystem, etc.)       (SQLite - read/write)
              │
              ▼
         [game/data]    ← 순수 데이터 정의 (Electron 무관)
         [game/utils]   ← 공식, 확률, 시간 유틸
```

**규칙:**
- `game/` 디렉토리는 Electron을 import하지 않음 (순수 JS)
- `db/` 는 `game/` 을 import하지 않음 (단방향)
- Systems는 서로 직접 import 금지 → GameWorld를 통해서만 통신

---

## 9. 폴더 구조

```
arcana/
├── docs/
│   ├── GDD.md              ← 게임 기획서 (모든 시스템의 기준)
│   └── ARCHITECTURE.md     ← 이 문서
│
├── src/
│   ├── main/
│   │   ├── index.js            ← Electron 앱 진입점
│   │   ├── windowManager.js    ← 창 생성/관리
│   │   ├── ipcRouter.js        ← IPC 요청 라우팅
│   │   └── gameWorld.js        ← 게임 루프 + 시스템 조율
│   │
│   ├── game/
│   │   ├── systems/
│   │   │   ├── PetSystem.js
│   │   │   ├── EvolutionSystem.js
│   │   │   ├── CombatSystem.js
│   │   │   ├── BreedingSystem.js
│   │   │   ├── HuntingSystem.js
│   │   │   ├── ExplorationSystem.js
│   │   │   ├── QuestSystem.js
│   │   │   ├── EconomySystem.js
│   │   │   ├── PartySystem.js
│   │   │   ├── ItemSystem.js
│   │   │   ├── StorySystem.js
│   │   │   └── NotificationSystem.js
│   │   │
│   │   ├── data/
│   │   │   ├── attributes.js   ← 10속성 정의 + 상성 차트
│   │   │   ├── characters.js   ← 캐릭터 라인업
│   │   │   ├── skills.js       ← 스킬 정의
│   │   │   ├── items.js        ← 아이템 카탈로그
│   │   │   ├── monsters.js     ← 몬스터 데이터
│   │   │   ├── quests.js       ← 퀘스트 정의
│   │   │   └── story.js        ← 챕터 + 선택지 데이터
│   │   │
│   │   └── utils/
│   │       ├── formula.js      ← 전투/스탯 공식
│   │       ├── random.js       ← 확률 계산 유틸
│   │       └── time.js         ← 시간 변환 유틸
│   │
│   ├── db/
│   │   ├── database.js         ← SQLite 연결 + 초기화
│   │   ├── migrations/         ← 스키마 버전 관리
│   │   └── models/
│   │       ├── Pet.js
│   │       ├── Item.js
│   │       ├── Quest.js
│   │       └── World.js
│   │
│   ├── renderer/
│   │   ├── overlay/
│   │   │   ├── index.html
│   │   │   ├── overlay.js      ← PixiJS 앱 초기화
│   │   │   ├── petRenderer.js  ← 펫 스프라이트 관리
│   │   │   └── playerRenderer.js
│   │   │
│   │   ├── launcher/
│   │   │   ├── index.html
│   │   │   ├── launcher.js
│   │   │   └── components/     ← 재사용 UI 컴포넌트
│   │   │
│   │   └── hunting/
│   │       ├── index.html
│   │       └── hunting.js      ← PixiJS 사냥터 씬
│   │
│   └── preload/
│       └── preload.js          ← contextBridge (IPC 노출)
│
├── assets/
│   ├── sprites/                ← AI 생성 PNG 스프라이트
│   ├── ui/                     ← UI 이미지, 아이콘
│   ├── audio/                  ← 효과음, BGM
│   └── items/                  ← 아이템 이미지
│
├── package.json
└── README.md
```

---

## 10. Phase 로드맵

| Phase | 범위 | 목표 |
|-------|------|------|
| Phase 0 | 아키텍처 + 폴더 구조 | 지금 단계 ✅ |
| Phase 1 | Core Loop | 펫 생성→시간→컨디션→오버레이 렌더링 |
| Phase 2 | 성장 + 진화 | 레벨업, 진화 트리거, 스킬 |
| Phase 3 | 사냥터 | 수동/자동 사냥, 전투, 드롭 |
| Phase 4 | 수집 + 교배 | 계보, 확률, 혼합속성 |
| Phase 5 | 스토리 + 퀘스트 | 5챕터, 선택지, 히든 엔딩 |
| Phase 6 | 온라인 | 교환, PvP, 랭킹 서버 |
