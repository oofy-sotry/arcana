# 세력 시스템 (Faction System) 설계

## 세계관 배경 (GDD 기반)

- **Luxis** — 빛의 군세. 질서와 정화를 추구
- **Noctis** — 어둠의 무리. 해방과 파괴를 추구
- **계약자 (플레이어)** — 어느 세력에도 속하지 않는 변수
- **아르카** — 양쪽 갈등을 먹고 자라는 시원 존재. 진짜 최종 보스

---

## 수치 구조

| 항목 | 설명 |
|------|------|
| `luxis_rep` | 0 ~ 100, 초기값 50 |
| `noctis_rep` | 0 ~ 100, 초기값 50 |
| 저장 위치 | `world_state` 테이블 (별도 테이블 불필요) |
| 히든 엔딩 조건 | \|luxis_rep − noctis_rep\| ≤ 20 |

두 수치는 **독립적**으로 존재 (한쪽이 오른다고 다른 쪽이 내려가지 않음).
단, 특정 선택지는 한쪽 +X / 다른쪽 −X 동시 적용 가능.

---

## 평판 변화 방법

### 1. 탐험 이벤트 선택지
`ExplorationSystem`의 이벤트에 `faction_choice` 타입 추가.

```
[사건] 부상당한 Luxis 병사를 발견했다.
  A. 치료해준다   → luxis_rep +5
  B. 모른척한다   → 변화 없음
  C. Noctis에 넘긴다 → noctis_rep +5, luxis_rep -3
```

### 2. 퀘스트 보상 (기존 구조 활용)
`quests.js`의 `faction_rep` 필드를 `{ luxis: N, noctis: N }` 형태로 확장.

### 3. 속성 펫 파티 편성
- 파티에 light 속성 펫 보유: 사냥마다 luxis_rep +0.05
- 파티에 dark 속성 펫 보유: 사냥마다 noctis_rep +0.05

---

## 평판 효과

| 수치 | Luxis 효과 | Noctis 효과 |
|------|-----------|------------|
| 30+ | Luxis 전용 퀘스트 해금 | Noctis 전용 퀘스트 해금 |
| 50+ | light 펫 출생 확률 +5% | dark 펫 출생 확률 +5% |
| 70+ | Luxis 전용 상점 해금 (빛 계열 아이템) | Noctis 전용 상점 해금 (어둠 계열 아이템) |
| 90+ | 빛 속성 히든 스킬 해금 | 어둠 속성 히든 스킬 해금 |

### 균형 효과 (|luxis − noctis| ≤ 20 유지 시)
- 히든 엔딩 "카오스(混)" 진행 카운트 활성화
- 혼합 속성 펫 출생 확률 +10%

---

## 스토리 챕터 연동

| 챕터 | Faction 연결 |
|------|-------------|
| 1장 — 각성 | 세력 소개, Luxis/Noctis 첫 등장, 중립 선택지 1개 |
| 2장 — 8구역 탐방 | 각 구역에 선택지 2~3개, 누적 평판 변동 |
| 3장 — 혼합속성 | light/dark 속성 해금, 세력의 진실 폭로 퀘스트 |
| 4장 — 전면전 | 누적 평판에 따라 동료 행동 분기 |
| 5장 — 엔딩 | 정규 엔딩 or 히든 엔딩(카오스) 분기 판정 |

---

## 동료 충성도 (Loyalty)

퀘스트 선택에 따라 파티 펫의 충성도 변동.

| 충성도 | 4장 행동 |
|--------|---------|
| 70+ | 진실을 믿고 따름 |
| 30~70 | 설득 필요 (특수 퀘스트 발생) |
| 30- | 아르카 영향으로 배신 (파티에서 이탈) |

저장: `pet_loyalty` 컬럼 (pets 테이블 추가 또는 world_state 키-값)

---

## 구현 필요 항목

### 신규 필드
- `pets.loyalty` INTEGER DEFAULT 70
- `world_state` 키: `luxis_rep`, `noctis_rep`

### 신규 클래스
- `FactionSystem.js` — 평판 조회/변경, 효과 계산, 충성도 관리

### 기존 시스템 수정
- `ExplorationSystem` — `faction_choice` 이벤트 타입 추가
- `QuestSystem` — faction_rep 보상 구조 `{luxis, noctis}` 형태로 확장
- `HuntingSystem` — 파티 속성 기반 faction passiv 틱
- `BreedingSystem` / `PetSystem` — light/dark 출생 확률에 faction 반영

### IPC 핸들러 (신규)
- `faction:status` — 현재 평판 + 활성 효과 조회
- `faction:choice` — 선택지 결과 적용

### UI
- 런처 Faction 탭 또는 상태바
- luxis/noctis 수치 바 (0~100)
- 현재 활성 효과 목록

---

## 미결 설계 사항 (추후 결정 필요)

- [ ] 탐험 이벤트 텍스트 실제 작성 (각 구역별 2~3개 시나리오)
- [ ] Luxis/Noctis 전용 상점 아이템 목록
- [ ] 동료 충성도 UI 표시 방식
- [ ] 챕터 잠금 방식 (퀘스트 진행도 기반? 레벨 기반?)
