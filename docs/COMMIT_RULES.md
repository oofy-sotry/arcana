# 아르카나 커밋 규칙

> 모든 커밋 전에 이 문서를 확인한다.

---

## 핵심 원칙: 최소 단위 커밋

```
하나의 커밋 = 하나의 변경
```

- 파일 1개 추가/수정 → 커밋 1개
- 함수 1개 추가 → 커밋 1개  
- 함수 1개 수정 → 커밋 1개

**절대 금지:**
- 여러 파일을 한 커밋에 묶기
- "이것저것 수정" 같은 모호한 메시지
- 기능 + 버그픽스 혼합

---

## 커밋 메시지 형식

```
<type>(<scope>): <설명>

[본문 — 필요 시]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### type 종류

| type | 사용 시점 | 예시 |
|------|----------|------|
| `feat` | 새 기능, 새 함수 추가 | `feat(pet): createPet 함수 추가` |
| `fix` | 버그 수정 | `fix(combat): 데미지 최솟값 1 미적용 수정` |
| `docs` | 문서 작성/수정 | `docs: 커밋 규칙 문서 작성` |
| `chore` | 설정, 폴더 구조, 의존성 | `chore: package.json 초기 설정` |
| `refactor` | 동작 변화 없이 코드 정리 | `refactor(pet): getAge 로직 단순화` |
| `style` | 포맷, 들여쓰기 (기능 무관) | `style(db): 쿼리 들여쓰기 정렬` |
| `test` | 테스트 추가/수정 | `test(formula): 데미지 공식 엣지케이스` |

### scope 종류

| scope | 대상 |
|-------|------|
| `pet` | PetSystem |
| `evolution` | EvolutionSystem |
| `combat` | CombatSystem |
| `breed` | BreedingSystem |
| `hunt` | HuntingSystem |
| `explore` | ExplorationSystem |
| `quest` | QuestSystem |
| `economy` | EconomySystem |
| `party` | PartySystem |
| `item` | ItemSystem |
| `story` | StorySystem |
| `notify` | NotificationSystem |
| `db` | 데이터베이스 계층 |
| `overlay` | 데스크톱 오버레이 창 |
| `launcher` | 런처/허브 창 |
| `hunting-ui` | 사냥터 창 |
| `ipc` | IPC 라우터 |
| `world` | GameWorld (루프) |
| `window` | WindowManager |

---

## 올바른 커밋 흐름 예시

### 새 파일을 추가할 때
```bash
# 1. PetSystem.js 파일 생성 (빈 클래스)
git add src/game/systems/PetSystem.js
git commit -m "feat(pet): PetSystem 클래스 기본 구조 추가"

# 2. createPet 함수 추가
git add src/game/systems/PetSystem.js
git commit -m "feat(pet): createPet 함수 추가"

# 3. getAge 함수 추가
git add src/game/systems/PetSystem.js
git commit -m "feat(pet): getAge 계산 함수 추가"
```

### 버그를 수정할 때
```bash
# 함수 하나의 로직을 고쳤으면 그것만 커밋
git add src/game/systems/CombatSystem.js
git commit -m "fix(combat): 방어력 초과 시 데미지 0 처리 누락 수정"
```

### 나쁜 커밋 예시
```bash
# ❌ 여러 파일 혼합
git add src/game/systems/PetSystem.js src/db/models/Pet.js src/main/ipcRouter.js
git commit -m "펫 관련 작업"

# ❌ 모호한 메시지
git commit -m "수정"
git commit -m "작업중"
git commit -m "여러가지 고침"
```

---

## 커밋 전 체크리스트

```
□ 변경된 파일이 1개인가?
□ 변경 내용이 함수/기능 1개인가?
□ 메시지가 type(scope): 형식인가?
□ 메시지만 보고 무슨 변경인지 알 수 있는가?
□ Co-Authored-By 라인이 있는가?
```

---

## 예외 상황

아래 경우만 2개 이상 파일을 한 커밋에 묶을 수 있음:

1. **파일 이름 변경** — 이름 변경 + import 경로 수정은 함께
2. **타입 정의 + 사용** — 인터페이스 파일과 그것을 즉시 사용하는 파일
3. **테스트 + 구현** — 함수 1개와 그 테스트 1개

단, 이 경우도 커밋 메시지에 명시해야 함:
```bash
git commit -m "feat(pet): PetSystem 파일명 변경 + import 경로 수정"
```
