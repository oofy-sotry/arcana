# 아르카나 (Arcana)

> 데스크톱 위를 돌아다니는 에레멘탈과 함께하는 육성 수집 RPG

---

## 프로젝트 소개

**아르카나**는 Electron 기반 데스크톱 펫 게임입니다.  
펫(에레멘탈)이 실제 바탕화면 위를 돌아다니며, 플레이어는 계약자로서 에레멘탈과 계약하고 함께 성장합니다.

디지몬 + 포켓몬 + 유희왕 세계관을 결합한 오리지널 스토리를 배경으로,  
육성 / 진화 / 수집 / 교배를 통해 전설의 에레멘탈 **옴니렉스**를 향해 나아갑니다.

---

## 핵심 특징

- 🖥️ **데스크톱 위를 자유롭게 돌아다니는 펫** — 창 안에 갇히지 않음
- ⚔️ **10가지 속성 + 혼합 속성 + 전속성** — 수백 가지 캐릭터 경로
- 🧬 **교배 체인 시스템** — 불호환 속성끼리 교배해 극희귀 혼합 속성 탄생
- 🌙 **2가지 성장 축** — 나이(시간)와 레벨(활동)이 독립적으로 기여
- 👥 **파티 시스템** — 주인공 + 에레멘탈이 함께 포메이션으로 돌아다님
- 📖 **5챕터 메인 스토리 + 히든 엔딩** — 선택이 결말을 바꾸는 서사

---

## 현재 상태 (2026-08-28 기준)

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
| 스프라이트 제작 | ⏳ 대기 (`assets/sprites`·`ui`·`audio`·`items` 전부 `.gitkeep`만 존재, 실제 에셋 없음) |

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
