# AI 작업 기록

날짜별로 Claude Code에게 맡긴 작업과 사람이 직접 확인·수정한 내용을 남긴다.

## 2026-10-21

### Claude에게 맡긴 것
- 개선 계획서(호미에이아이 지원용)와 CLAUDE.md 초안을 저장소 상태와 대조해 검토
- CLAUDE.md 저장소 루트 배치, `docs/ai-log.md`·`docs/progress.md` 생성, pnpm 설치(corepack)

### 직접 확인·수정한 것
- 검토 결과 6개 쟁점에 대해 결정: 골드버전 개편은 중단이 아니라 후순위, 커밋은 전역 최소 단위 규칙 적용,
  진행 기록 2종만 저장소 `docs/`에 두고 설계문서는 위키 유지, 모노레포 전환 시 이동·삭제는 단계별 확인,
  D6 선택 항목(FastAPI·Redis·AWS·자동 업데이트)도 빼지 않고 전부 진행
- LLM 공급자 결정: 유료 Claude API 대신 무료 구성(Ollama 로컬 + GitHub Models)으로 변경 지시

### Claude에게 맡긴 것 (D1)
- README 소개 문구·현재 상태 표·기술 구조 섹션·프로젝트 구조 작성 (코드를 읽고 사실 확인 후 작성)
- 서버 없이 실행 확인용 헤드리스 Electron 하네스 작성·실행, Windows 크로스빌드 실행
- 런처 CSP가 WebSocket을 막는 버그를 하네스로 재현(`securitypolicyviolation` 이벤트로 확인)

### 직접 확인·수정한 것 (D1)
- (작성 예정 — README 내용 검토 후 기록)
