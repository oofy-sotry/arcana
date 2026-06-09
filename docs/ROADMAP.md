# 아르카나 전체 로드맵

> 큰 틀 기획서. 각 Phase 시작 전에 해당 Phase의 상세 커밋 계획을 COMMIT_PLAN.md에 추가한다.  
> 세부 사항은 변동 가능. 완료 기준(Done)이 핵심.

---

## 전체 Phase 개요

| Phase | 이름 | 완료 기준 | 예상 커밋 |
|-------|------|----------|----------|
| 0 | 기반 설계 | GDD + 아키텍처 + 폴더 구조 | 6 ✅ |
| 1 | Core Loop | 펫이 바탕화면을 걷고, 시간이 지나면 컨디션이 줄어든다 | ~58 |
| 2 | 성장 + 런처 | 펫을 키우고, 런처에서 관리하고, 진화할 수 있다 | ~70 |
| 3 | 사냥터 + 전투 | 사냥터에 입장해서 수동/자동 전투를 할 수 있다 | ~65 |
| 4 | 수집 + 교배 + 파티 | 교배해서 새 펫을 얻고, 파티를 구성할 수 있다 | ~60 |
| 5 | 스토리 + 퀘스트 | 5챕터 스토리를 플레이하고 퀘스트를 완료할 수 있다 | ~75 |
| 6 | 온라인 | 다른 유저와 교환·PvP를 할 수 있다 | ~120 |
| **합계** | | | **~454** |

---

## Phase 1 — Core Loop

**상세 계획:** `COMMIT_PLAN.md` 참조

```
완료 기준:
  ✅ 앱 실행 → 펫이 바탕화면 위를 걸어다님
  ✅ 60초마다 컨디션(배고픔/행복도/에너지) 감소
  ✅ 앱 종료 후 재실행 → 경과 시간만큼 컨디션 반영
  ✅ 나이가 쌓임 (12시간 실시간 = 1살)
```

**핵심 파일:**
- `src/main/index.js` — 진입점
- `src/main/gameWorld.js` — 60초 루프
- `src/db/` — SQLite 기반
- `src/game/systems/PetSystem.js` — 컨디션/나이
- `src/renderer/overlay/` — PixiJS 오버레이

---

## Phase 2 — 성장 + 런처 UI

```
완료 기준:
  ✅ 경험치 획득 → 레벨업 → 스탯 성장
  ✅ 진화 조건 달성 → 진화 (일반/강화/히든/암흑)
  ✅ 스킬 포인트로 스킬 강화
  ✅ 런처 창에서 펫 목록/스탯/컨디션 확인
  ✅ 펫 클릭 시 상태 팝업
  ✅ 아이템 기본 사용 (생명의 부적, 진화의 돌)
```

**새로 추가되는 시스템:**
| 파일 | 역할 |
|------|------|
| `src/game/systems/LevelSystem.js` | 경험치, 레벨업, 스탯 성장 공식 |
| `src/game/systems/EvolutionSystem.js` | 진화 트리거 판정, 스테이지 변경 |
| `src/game/systems/SkillSystem.js` | 스킬 해금, 스킬 포인트 분배 |
| `src/game/systems/ItemSystem.js` | 인벤토리, 아이템 사용 효과 |
| `src/game/data/characters.js` | 캐릭터 진화 트리 정의 |
| `src/game/data/skills.js` | 스킬 데이터 정의 |
| `src/game/data/items.js` | 아이템 카탈로그 |
| `src/db/migrations/002_growth.js` | 스킬, 아이템, 진화 기록 테이블 |
| `src/renderer/launcher/index.html` | 런처 창 HTML |
| `src/renderer/launcher/launcher.js` | 런처 초기화 |
| `src/renderer/launcher/components/PetCard.js` | 펫 카드 UI |
| `src/renderer/launcher/components/StatPanel.js` | 스탯 표시 |
| `src/renderer/launcher/components/SkillTree.js` | 스킬트리 UI |
| `src/main/ipcRouter.js` | pet:level-up, evolution:attempt 등 핸들러 추가 |

**Phase 1 → 2 연결 포인트:**
- Phase 1의 `PetSystem`에 `addExperience()` 추가
- Phase 1의 `DB 스키마`에 `pet_skills`, `items` 테이블 추가

---

## Phase 3 — 사냥터 + 전투

```
완료 기준:
  ✅ 사냥터 창 입장/퇴장
  ✅ 수동 모드: 방향키로 이동, 적과 충돌 시 전투
  ✅ 자동 모드: 방치 시 자동 전투, 에너지 소진까지
  ✅ 전투 공식 적용 (공격 × 스킬계수 - 방어 × 상성)
  ✅ 드롭 획득 (코인, 아이템, 소재)
  ✅ 보물탐사 이벤트
  ✅ 수동/자동 에너지 소모 차이 적용
```

**새로 추가되는 시스템:**
| 파일 | 역할 |
|------|------|
| `src/game/systems/CombatSystem.js` | 전투 공식, 턴 처리, 스킬 발동 |
| `src/game/systems/HuntingSystem.js` | 사냥터 구역, 몬스터 스폰, 에너지 관리 |
| `src/game/systems/ExplorationSystem.js` | 보물탐사, 랜덤 이벤트 |
| `src/game/utils/formula.js` | 데미지/크리티컬/상성 계산 함수 |
| `src/game/data/monsters.js` | 몬스터 스탯, 드롭 테이블 |
| `src/db/migrations/003_hunting.js` | 사냥 기록, 드롭 기록 테이블 |
| `src/renderer/hunting/index.html` | 사냥터 창 HTML |
| `src/renderer/hunting/hunting.js` | PixiJS 사냥터 씬 |
| `src/renderer/hunting/monsterRenderer.js` | 몬스터 스프라이트 |
| `src/renderer/hunting/combatUI.js` | 전투 UI (HP바, 스킬 버튼) |

**Phase 2 → 3 연결 포인트:**
- `SkillSystem`의 스킬 데이터를 `CombatSystem`이 사용
- 드롭 결과가 `ItemSystem` 인벤토리로 연결

---

## Phase 4 — 수집 + 교배 + 파티

```
완료 기준:
  ✅ 교배 신청 → 확률 계산 → 새 펫 탄생
  ✅ 혼합 속성 탄생 가능 (1% 확률)
  ✅ 계보 추적 (부모-자식 관계)
  ✅ 파티 구성 (주인공 + 펫 최대 3마리)
  ✅ 파티 포메이션 선택 (삼각/사각/오각)
  ✅ 파티 시너지 보너스 적용
  ✅ 주인공(계약자) 아바타 바탕화면 렌더링
  ✅ 컬렉션 도감 UI
```

**새로 추가되는 시스템:**
| 파일 | 역할 |
|------|------|
| `src/game/systems/BreedingSystem.js` | 교배 확률, 속성 유전, 돌연변이 |
| `src/game/systems/PartySystem.js` | 파티 구성, 포메이션, 시너지 계산 |
| `src/game/systems/ContractorSystem.js` | 주인공 스탯, 계약자 레벨 |
| `src/game/data/attributes.js` | 10속성 정의, 14혼합 속성, 상성 차트 |
| `src/db/migrations/004_collection.js` | 계보, 교배 기록, 파티 테이블 |
| `src/renderer/overlay/playerRenderer.js` | 주인공 아바타 PixiJS 렌더링 |
| `src/renderer/launcher/components/BreedingPanel.js` | 교배 UI |
| `src/renderer/launcher/components/PartyPanel.js` | 파티 구성 UI |
| `src/renderer/launcher/components/Collection.js` | 도감 UI |

**Phase 3 → 4 연결 포인트:**
- 사냥 경험치가 `ContractorSystem` 계약자 레벨에도 영향
- 파티 구성이 사냥터 전투 보너스로 연결

---

## Phase 5 — 스토리 + 퀘스트 + 경제

```
완료 기준:
  ✅ 메인 퀘스트 5챕터 클리어 가능
  ✅ 스토리 선택지 → 분기 → 결과 기록
  ✅ 영혼 동화도 게이지 증가/감소
  ✅ 히든 엔딩 조건 달성 가능 (카오스 엔딩)
  ✅ 일일 퀘스트, 특수 퀘스트
  ✅ 코인 경제 완성 (획득/소각 밸런스)
  ✅ 가챠 시스템
  ✅ 알림 시스템 (OS 알림)
```

**새로 추가되는 시스템:**
| 파일 | 역할 |
|------|------|
| `src/game/systems/StorySystem.js` | 챕터 진행, 선택지, 플래그 관리 |
| `src/game/systems/QuestSystem.js` | 퀘스트 등록/추적/완료/보상 |
| `src/game/systems/SoulFusionSystem.js` | 영혼 동화도 계산 (히든 엔딩 트리거) |
| `src/game/systems/EconomySystem.js` | 코인 획득/소비, 가챠 확률 |
| `src/game/systems/NotificationSystem.js` | OS 알림 발송 조건 |
| `src/game/data/story.js` | 5챕터 텍스트 + 선택지 데이터 |
| `src/game/data/quests.js` | 퀘스트 정의 |
| `src/db/migrations/005_story.js` | 스토리 플래그, 퀘스트 진행 테이블 |
| `src/renderer/launcher/components/StoryPanel.js` | 스토리 UI |
| `src/renderer/launcher/components/QuestPanel.js` | 퀘스트 목록 UI |
| `src/renderer/launcher/components/Shop.js` | 상점 UI |

---

## Phase 6 — 온라인

```
완료 기준:
  ✅ 계정 등록/로그인 (오프라인은 등록 불필요)
  ✅ 온라인 교배 신청/수락
  ✅ 펫 교환
  ✅ 1:1 PvP 매칭 + 전투
  ✅ 랭킹 시스템
```

> Phase 6은 별도 서버 필요. 상세 설계는 Phase 5 완료 후 진행.

**예상 추가 기술 스택:**
| 항목 | 기술 |
|------|------|
| 서버 | Node.js + Fastify |
| 실시간 | WebSocket |
| DB (서버) | PostgreSQL |
| 인증 | JWT |

**Phase 1~5 설계 시 온라인 대비:**
- 모든 펫에 `uuid` 컬럼 포함 (Phase 1 DB에서 이미 반영)
- 교배 기록에 `requester_uuid` 필드 구조 예약
- 아이템에 `tradeable` 플래그 컬럼 예약

---

## 의존성 흐름

```
Phase 1 (Core Loop)
    │
    ├─► Phase 2 (성장 + 런처)      ← 펫 없이 성장 불가
    │       │
    │       ├─► Phase 3 (사냥터)   ← 스킬 없이 전투 불가
    │       │       │
    │       │       └─► Phase 4 (교배 + 파티) ← 전투 없이 교배 불필요
    │       │                   │
    │       └───────────────────┼─► Phase 5 (스토리 + 퀘스트)
    │                           │
    └───────────────────────────┴─► Phase 6 (온라인)
```

---

## 변동 가능 항목

아래는 개발 중 조정될 수 있는 부분:
- 각 Phase의 커밋 수 (실제 구현 복잡도에 따라)
- Phase 2와 3의 순서 (런처 UI를 먼저 할지 전투를 먼저 할지)
- Phase 5 퀘스트 데이터 양 (스토리 분량에 따라)
- Phase 6 기술 스택 (서버 설계 시점에 재검토)

**변동 불가 항목 (Phase 1 DB에서 반드시 반영):**
- 펫 `uuid` 컬럼
- `attribute` 타입 (혼합속성 대비 TEXT로)
- `evolution_stage` 컬럼 (5단계 대비)
- `last_save` 타임스탬프 (오프라인 진행)
