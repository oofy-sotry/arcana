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

- [x] desktop 배선: `agentService`(TS, 연결 확인·꺼짐 상태·입력 검증 500자), `agentGameApi.js`(기존 시스템 호출만), IPC `agent:status`·`agent:chat`, preload `arcana.agent`
- [x] 기본 모델을 large(Gemini)로 변경 — 작은 모델은 D4에서 tool 없는 대화용으로 라우팅
- [x] 실기기 확인(헤드리스 Electron, 실제 main/index.js): 켜짐 → "내 펫 상태 어때?"에 tool 1번·2단계·첫 토큰 0.7초로 답함 / 키 없음·연결 불가·깨진 설정 3경우 모두 에이전트만 꺼지고 펫 생성·조회 정상 / 로그·저장 파일 182개에 키 없음
- [x] 테스트: desktop 69, server 65, game-core 5, shared 2, agent 55 — 전부 통과(종료 코드 0)

- [x] 런처 "도우미" 탭: 토큰 스트리밍(main→renderer 이벤트 `agent:token`·`agent:tool`, shared `IPC_EVENT_CHANNELS`), tool 실행 줄, 측정값(모델·tool 수·단계·토큰·첫 토큰), 꺼짐 이유 안내. 모델 출력은 textContent로만 표시
- [x] 실기기 확인(헤드리스 런처 + 스크린샷): "불꽃이 상태 어때? 어디서 사냥하면 좋을까?" → 펫 상태 확인·사냥터 찾기 tool 2번, 3단계로 답함 / 키 없음이면 안내 문구 + 입력 비활성 / 렌더러 콘솔 오류 없음
- 스크린샷으로 찾아 고친 것: 답에 마크다운 `**`가 그대로 보임(시스템 프롬프트에 평문 지시), 꺼진 보내기 버튼이 눌리는 것처럼 보임
- [x] 패키징 확인(`electron-builder --dir`): asar에 `@arcana/agent`의 `dist`·`config/agent.default.json` 포함. TS 원본(`src/*.ts`)도 함께 들어감 — 실행엔 무관, D6에서 정리
- [x] 테스트: desktop 76, server 65, game-core 5, shared 2, agent 56 — 전부 통과(종료 코드 0)
- [x] **완료 기준 확인**: 배고픔 15·사료 3개인 펫에 "배고파 보이면 밥 주고 레벨 맞는 사냥터 가줘" → 펫 상태·가방 확인, 사료 사용, 사냥터 찾기, 자동 사냥 (tool 5번·6단계, 토큰 4822/124, 첫 토큰 0.7초). 실제 게임 상태 변화: 배고픔 15→55, 사료 3→2, 에너지 100→40(2전 1승 1패)
- 주의: 6단계는 단계 상한(6)과 같음 — tool을 한 번에 하나씩 부르면 조금만 긴 요청도 상한에 걸림. D4에서 상한·병렬 호출·컨텍스트 선택과 함께 볼 것
- **D3 완료**

## 2026-10-23 — D4 모델 라우팅 + 컨텍스트 선택
- [x] 라우팅(`router.ts`): 설정의 tool별 키워드·의존 tool 규칙. tool이 필요 없으면 잡담 모델(작은 모델), 필요하면 큰 모델에 고른 tool만
- [x] 컨텍스트 선택(`context.ts`): 잡담=펫 이름·레벨, tool=펫 상태 수치, 아이템 tool이면 가방 요약. 값은 펫 tool `run()` 재사용
- [x] 대화 기록(`memory.ts`): 최근 4턴 원문, 오래된 턴은 규칙 기반 요약 한 줄 (LLM 요약은 느리거나 한도를 써서 제외)
- [x] 잘못 라우팅 대응: 잡담 모델이 `NEED_TOOLS`로 답하거나 시간 초과·오류면 tool 전체를 주고 큰 모델로. 큰 모델 429는 한 번 재시도
- [x] 로그: 요청마다 `[agent] ok route=… model=… tools=… context=…자 history=… tokens=… steps=…` 한 줄 (메시지 원문은 남기지 않음)
- [x] 고정 요청 세트 20개(`test/fixtures/requests.json`) + `pnpm --filter @arcana/agent route-report`: 라우팅 일치 20/20, 상태+tool 설명 글자 수 평균 -70% (전부 넣을 때 2094자 → 637자)
- [x] 실모델 확인(런처 하네스): 완료 기준 문장이 **6단계·tool 5번·입력 4822토큰 → 4단계·tool 3번·3380토큰(-30%)** — 상태를 미리 넣어 조회 단계가 빠짐, 단계 상한 문제 해소
- 발견: "안녕! 오늘 기분 어때?"가 키워드 "기분" 때문에 큰 모델로 감 (안전한 쪽 오분류)
- 발견·수정: 작은 모델이 소문자 `need_tools`로 답함 → 대소문자 무시로 판별, "고마워!"에도 NEED_TOOLS → 잡담 프롬프트 보강
- **문제: 작은 모델 지연이 들쭉날쭉** — 캐시가 맞으면 첫 토큰 0.5초, 캐시 없는 138토큰 입력은 첫 토큰 35초·전체 160초. 원인 추정: VirtualBox VM에 AVX/AVX2가 노출되지 않음(`/proc/cpuinfo`에 sse4_2까지만, 호스트 i7-1165G7은 AVX2·AVX-512 지원). 잡담 요청이 90초 시간 초과로 큰 모델로 넘어간 사례 있음 → 사용자 결정 필요
- 결정(사용자): 작은 모델은 현 상태 유지, **이 VM의 한계로 기록**. 잡담 모델 시간 초과를 90초 → 20초로 줄여 빨리 큰 모델로 넘김
- [x] 테스트: desktop 77, server 65, game-core 5, shared 2, agent 88 — 전부 통과(종료 코드 0)
- **D4 완료**

## 2026-10-23 — D5 비용·지연 기록 + 3조건 비교 측정
- [x] 참고 단가표(설정 `pricing`, large=Gemini Flash-Lite 유료 단가 입력 $0.25·출력 $1.5/100만 토큰, small=0)와 환산 비용 계산(`pricing.ts`)
- [x] 요청 기록(`requestRecord.ts`, 메시지 원문 제외) → desktop DB `018_agent_requests`(모델·입력/출력 토큰·첫 토큰·전체 시간·환산 비용·tool 수·성공) 저장, `agent:stats`
- [x] 런처 도우미 탭 📊 통계: 전체·실패·환산 비용, 모델별 평균 지연·토큰·비용
- [x] 비교용 `strategy` 옵션(full·routing·routing+context, 기본 동작은 그대로)과 `pnpm --filter @arcana/agent benchmark`
- [x] 실제 호출로 드러난 버그 수정: Gemini가 병렬 tool 호출을 청크마다 index 없이 따로 보내 한 호출로 합쳐짐 → id로 구분
- [x] 비교 측정(요청 20개 × 3조건, 원본 `packages/agent/bench/2026-10-23-same-model.json`). **잡담·tool 모두 같은 모델(Gemini)** 로 재서 라우팅·컨텍스트 선택만의 효과를 봄

| 조건 | 성공 | 평균 입력 토큰 | 환산 비용 합 | 전체 시간 중앙값 | 단계 상한 도달 | 기대 행동 실행 |
|---|---|---|---|---|---|---|
| ① 큰 모델 + 상태 전부 | 20/20 | 1188 | $0.00721 | 2.00초 | 0 | 5/5 |
| ② 라우팅만 | 20/20 | 726 (-39%) | $0.00496 (-31%) | 1.45초 | 0 | 5/5 |
| ③ 라우팅 + 컨텍스트 선택 | 20/20 | 628 (**-47%**) | $0.00458 (**-37%**) | 1.80초 | 0 | 5/5 |

- 지연은 중앙값으로 적음: 평균은 ③이 3.10초로 높게 나오는데 한 건(19.3초, 첫 토큰 0.77초·재시도 없음)이 Gemini 응답 지연으로 튄 영향
- 품질 유지: 평균 tool 호출 0.65로 세 조건 같음, 실행형 요청 5개 모두 기대 행동(사료·물약 사용, 자동 사냥) 실행, 429 재시도 0
- 잡담 모델을 Ollama로 두지 않은 이유: 이 VM에서 첫 토큰 수십 초·들쭉날쭉(D4 기록) → 지연 숫자가 모델 차이로 흐려짐. 참고로 잡담 8건을 비용 0으로 치면 ② -44%, ③ -47% (계산값, 실측 아님)
- 측정용으로 쓴 사용자 덮어쓰기(`~/.config/arcana/agent.json`의 `chatModel: large`)는 측정 뒤 삭제 — 실제 앱 잡담은 다시 Ollama
- 재부팅 강제 종료로 마지막 커밋 오브젝트가 0바이트로 깨짐 → 빈 오브젝트 삭제, `main`을 마지막 정상 커밋으로 되돌린 뒤 작업 폴더 내용으로 다시 커밋 (코드 손실 없음)
- [x] 테스트: desktop 83, server 65, game-core 5, shared 2, agent 106 — 전부 통과(종료 코드 0)
- **D5 완료**

## 다음 할 일
- D6: GitHub Actions 배포 자동화 (선택 항목 FastAPI·Redis 큐·AWS·electron-updater 포함)
- 나중에(선택): VM에 AVX2를 노출하면(호스트 Hyper-V·메모리 무결성 끄기 등) 작은 모델 재측정
- D6에서: 설치 파일에 agent TS 원본이 들어가지 않게 정리
- 후순위: 골드버전 개편 6-2 두 번째 마을(`town2`)부터 재개 — 위키 GOLD_REDESIGN 7-2장
