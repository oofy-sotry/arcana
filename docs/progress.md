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

## 다음 할 일
- D3: AI 펫 에이전트 기본 (Ollama 설치, GitHub Models 토큰 필요)
- 후순위: 골드버전 개편 6-2 두 번째 마을(`town2`)부터 재개 — 위키 GOLD_REDESIGN 7-2장
