# CLAUDE.md — arcana

## 프로젝트
Electron 기반 데스크톱 펫 RPG. 펫(에레멘탈)이 바탕화면 위를 돌아다니고, 런처 창에서 육성·사냥·교배·스토리를 진행한다. 온라인 기능은 Express 서버가 담당한다.

## 현재 작업 목표
호미에이아이 지원용 보강. 순서: README 정리 → 모노레포 전환 → AI 펫 에이전트 → 모델 라우팅·컨텍스트 선택 → 비용·지연 기록 → 배포 자동화.
게임 콘텐츠(스토리·몬스터·맵) 추가와 기존 코드 전체 TypeScript 전환은 하지 않는다.

## 구조 (pnpm workspaces + Turborepo)
- `apps/desktop` — Electron 클라이언트
  - `src/main` — 게임 월드, 창 관리, IPC 라우터, 로거, AI 에이전트
  - `src/preload` — contextBridge로 renderer에 API 노출
  - `src/renderer` — 런처·사냥·오버레이·월드 화면 (PixiJS)
  - `src/game` — 게임 시스템과 데이터
  - `src/db` — sql.js 저장소와 마이그레이션
- `apps/server` — Express + sql.js, JWT 인증, 실시간 매칭
- `apps/gateway` — Python FastAPI. OpenAI 호환 LLM 게이트웨이(공급자 키 보관·요청 계측)와 Redis 큐 대화 요약 워커. 에이전트 루프·tool은 desktop main에 그대로 둔다
- `packages/shared` — TypeScript. IPC 채널 이름, 공용 데이터 타입 (`apps/desktop/test/ipcChannels.test.js`가 실제 채널과 일치하는지 확인)
- `packages/game-core` — JS. 클라이언트·서버가 함께 쓰는 게임 규칙 (속성 상성, 데미지 공식, 몬스터 데이터)

## 작업 규칙
- 한 단계씩 진행하고, 단계가 끝나면 무엇을 바꿨는지 요약한 뒤 다음 단계로 넘어가기 전에 확인을 받는다.
- 테스트를 먼저 작성하고 구현한다. 기존 테스트는 항상 통과해야 한다.
- 테스트 결과는 잘라 보지 말고 종료 코드까지 확인한 뒤에만 커밋한다.
- 커밋은 최소 단위(함수 하나·기능 하나·코드 한 줄 수준, DI/IPC/preload 배선도 파일당 1커밋)로 나눈다. 커밋 전에 스테이징 범위를 확인해 다른 변경이 섞이지 않게 한다.
- 파일·데이터·브랜치 삭제, DB 초기화, 강제 push는 반드시 먼저 확인을 받는다.
- 새로 작성하는 에이전트 코드와 `packages/shared`는 TypeScript로 쓴다. 기존 JS 코드는 필요한 부분만 수정한다.
- 기존 커밋 규칙은 위키 COMMIT_RULES를 따른다.

## Electron 보안 규칙
- 모든 BrowserWindow는 `contextIsolation: true`, `nodeIntegration: false`를 유지한다.
- renderer가 쓰는 기능은 preload의 contextBridge로만 노출한다. ipcRenderer 자체를 노출하지 않는다.
- IPC 핸들러는 renderer에서 온 입력을 검증한다.
- LLM API 키는 main 프로세스(환경변수 또는 사용자 설정 파일)에만 둔다. renderer·preload·로그·저장소에 키를 남기지 않는다.

## AI 펫 에이전트 규칙
- 에이전트 루프는 main 프로세스에서 실행한다.
- tool은 기존 게임 시스템 함수를 재사용한다. 게임 상태를 직접 바꾸는 새 로직을 tool 안에 만들지 않는다.
- 실행 단계 수에 상한을 둔다. tool 입력은 실행 전에 검증한다.
- 모델 이름과 라우팅 기준은 설정으로 분리하고 코드에 하드코딩하지 않는다.
- 프롬프트에는 요청에 필요한 게임 상태만 넣는다. 전체 상태를 그대로 넣지 않는다.
- 요청마다 모델, 입력/출력 토큰, 첫 토큰까지 시간, 전체 응답 시간, 비용, tool 호출 수, 성공 여부를 기록한다.
- LLM은 무료 공급자를 쓴다: 작은 모델은 Ollama 로컬, 큰 모델은 Google Gemini API(GitHub Models는 2026-07-30 종료). 둘 다 OpenAI 호환 API로 호출하고, 공급자 주소·모델 이름은 설정으로만 바꾼다.
- 작은 모델(CPU 전용 3B)은 tool 없는 짧은 대화에만 쓰고, tool이 필요한 요청은 큰 모델로 보낸다.
- 비용은 실제 과금이 없으므로 설정의 참고 단가표로 환산 비용을 계산해 기록한다. 무료 한도 초과(429)는 재시도 또는 다른 모델로 넘긴다.
- LLM 공급자에 연결할 수 없으면 에이전트 기능만 비활성화하고 게임은 정상 동작해야 한다.

## 명령
- 실행: `pnpm --filter desktop start`
- 테스트: `pnpm test` (= `turbo run test`, 패키지별 결과는 `<패키지>:test:` 접두어로 출력). gateway 테스트는 처음 한 번 `pnpm --filter gateway run venv`(.venv 생성) 필요
- 게이트웨이: `pnpm --filter gateway start` / `pnpm --filter gateway worker` (환경변수 `ARCANA_GATEWAY_TOKEN`, `GEMINI_API_KEY`, `REDIS_URL` — 이 VM의 6379는 다른 프로젝트 Redis이므로 개발용은 6380)
- 배포(서버·게이트웨이·워커·Redis): `cp .env.example .env`(값 채우기) → `docker compose pull && docker compose up -d` → `ARCANA_GATEWAY_TOKEN=<토큰> deploy/smoke.sh`. 이미지는 main push 때 `images.yml`이 ghcr.io에 올린다(`latest`, `sha-<7자리>`)
- 빌드: `pnpm --filter desktop build` (Windows 설치 파일: `apps/desktop`에서 `pnpm exec electron-builder --win --x64`)

## 기록
- 작업을 마칠 때 진행 상황과 다음 할 일을 `docs/progress.md`에 남긴다.
- `docs/ai-log.md`에 날짜별로 Claude에게 맡긴 작업과 사람이 직접 확인·수정한 내용을 기록한다.
