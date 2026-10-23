# 진행 상황

계획: 호미에이아이 지원용 보강 (README → 모노레포 → AI 펫 에이전트 → 라우팅·컨텍스트 → 비용·지연 → 배포 자동화 → 마무리)

## 2026-10-21 — 준비
- [x] CLAUDE.md 저장소 루트 배치
- [x] `docs/ai-log.md`, `docs/progress.md` 생성
- [x] pnpm 12.14.0 설치 (corepack)

## 2026-10-21 — D1 README 정리, 빌드 확인
- [x] README 소개에서 다른 작품 이름 삭제 → "몬스터 육성·수집 장르의 오리지널 세계관"
- [x] 현재 상태 표 갱신(골드 개편, 캐릭터 스프라이트 130장)
- [x] 기술 구조 섹션: 프로세스 구조 그림, 보안 설정, IPC 설계, 오버레이 클릭 통과, 서버, 실행·테스트·빌드
- [x] 프로젝트 구조 트리 갱신
- [x] 오프라인 실행 확인: 서버 없이 시작 화면 → 소환사 생성 → 월드맵 진입까지 런처 콘솔 에러 없음(헤드리스 하네스)
- [x] Windows 설치 파일 빌드 확인: `electron-builder --win --x64` 종료 코드 0
- [x] 기준 테스트: 클라이언트 63/63, 서버 65/65 통과 (처음엔 "클라이언트 128"로 적었으나 루트 `node --test`가 server/test까지 함께 돌린 값이었음 — D2에서 정정)
- 발견: 런처 CSP에 `connect-src`가 없어 실시간 PvP·파티 사냥 WebSocket이 차단됨(`CSP BLOCK connect-src ws://…`) — D2 전에 수정(`159f1e0`, 회귀 테스트 `c871981`)
- 발견: 패키징 대상에 `server/`·`test/`가 포함됨 — D2에서 `build.files`로 정리

## 2026-10-21 — D2 모노레포 전환
- [x] npm → pnpm 12 (`pnpm import`로 기존 잠금 파일 버전 유지, 서버 직접 의존성 express 4.22.2·ws 8.21.0 고정)
- [x] `packages/game-core`(JS): 서버가 `../../src/game/...`로 직접 불러오던 attributes·formula·monsters 분리
- [x] `apps/server`, `apps/desktop`으로 이동. 서버 DB 기본 경로를 `apps/server/data`로 바꾸고 기존 DB 파일 이동(삭제 없음)
- [x] Turborepo: `pnpm test` = `turbo run test` (shared 빌드 → 패키지별 테스트)
- [x] `packages/shared`(TypeScript 7): IPC 채널 93개 목록·`Pet` 등 공용 타입. desktop 테스트가 ipcRouter·preload와 일치 확인
- [x] 테스트: desktop 64, server 65, game-core 5, shared 2 — 전부 통과(종료 코드 0)
- [x] 실기기 확인: `apps/desktop`에서 헤드리스로 띄워 시작 → 소환사 생성 → 월드맵 진입, 런처 에러 없음
- [x] Windows 설치 파일: `apps/desktop`에서 빌드 성공, `@arcana/game-core` 포함 확인. 패키징 이름은 `extraMetadata`로 기존과 같은 `arcana` 유지, `test/`·`.turbo` 제외
- 참고: 데스크톱 패키지 이름은 `desktop`, `productName: "arcana"`로 개발용 저장 경로(`~/.config/arcana`) 유지

## 2026-10-23 — D3 AI 펫 에이전트 (진행 중)
- [x] `packages/agent`(TypeScript): 설정(공급자·모델·단계 상한 JSON 분리), OpenAI 호환 스트리밍 클라이언트, tool 입력 검증, 에이전트 루프(단계 상한), 펫 tool 6개(기존 게임 함수 주입)
- [x] Ollama 0.40.9 + `qwen2.5:3b` 설치
- [x] 큰 모델 공급자 교체: GitHub Models가 2026-07-30 종료 → Gemini API(`gemini-flash-lite-latest`). 종료된 주소는 모든 요청에 `200 OK` 본문 `OK`만 돌려줘 오류로 보이지 않았음
- [x] 실제 호출로만 드러난 Gemini 호환 버그 2건 수정: 스트리밍 tool 호출 조각에 `index` 없음, `thought_signature`를 되돌려 보내지 않으면 400
- [x] 실측("불꽃이 배고파 보이는데 먹을 거 있으면 줘"): Gemini 4단계·tool 3번·첫 토큰 약 1.5초로 사과 사용까지 완료 / qwen2.5:3b(CPU 4코어) 21분 21초·tool 1번, 사용 안 하고 설명만 함
- 결정: 작은 모델은 tool 없는 짧은 대화에만, tool이 필요한 요청은 큰 모델로 (D4 라우팅에서 구현)
- [x] 테스트: desktop 64, server 65, game-core 5, shared 2, agent 44 — 전부 통과(종료 코드 0)

## 다음 할 일
- D3 5단계: desktop main 배선(에이전트 생성·IPC 핸들러·preload 노출), 공급자 연결 불가 시 에이전트만 비활성화
- D3 6단계: 런처 대화창, 실모델 완료 기준 확인
- 후순위: 골드버전 개편 6-2 두 번째 마을(`town2`)부터 재개 — 위키 GOLD_REDESIGN 7-2장
