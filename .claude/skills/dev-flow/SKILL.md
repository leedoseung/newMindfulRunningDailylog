---
name: dev-flow
description: 모든 코드 작성/수정 시 필수 워크플로우. TDD + 아키텍처 리뷰 + 검증 강제. 코드 편집 시작 전 무조건 발동.
---

# Dev Flow — 개발 워크플로우 강제

## 발동 조건
- 파일 편집 시작 전
- 새 기능 구현
- 버그 수정
- 리팩터링

## 순서 (스킵 금지)

### 1. Explore (탐색)
- `search_graph(name_pattern=...)` — 기존 심볼 찾기
- `trace_path(function_name=..., direction=inbound)` — 영향 분석
- `get_code_snippet(qualified_name=...)` — 소스 읽기
- 절대: grep → read → grep 루프 금지

### 2. Clarify (명확화)
애매점 있음 → `AskUserQuestion`. 3개 이하 옵션. 추측 X.

### 3. Plan (계획)
non-trivial (2+ 파일 or 아키텍처 결정) → `EnterPlanMode`.

### 4. TDD (테스트 먼저)
1. 실패 테스트 작성 → `npm test` → **빨간불 확인**
2. 최소 구현 → `npm test` → **초록불 확인**
3. 리팩터 → 테스트 유지

happy path + 실패 케이스 + 엣지 (empty/null/boundary/tz/overflow).

### 5. Ripple (파급 효과)

**옵션 A - 직접 (작은 변경):**
- `search_code(pattern=<symbol>)` — 문자열 참조
- `trace_path(direction=inbound)` — 호출 그래프

**옵션 B - 서브에이전트 (권장, 2+ 파일):**
```
Agent(subagent_type="ripple-checker", prompt="방금 완료된 diff 파급 효과 검증")
```
- `verdict: "block"` → 완료 X, findings fix
- `verdict: "concerns"` → 리뷰 후 진행
- `verdict: "safe"` → 다음 단계

### 6. Verify (증거 필수)
```bash
npm run typecheck 2>&1
npm test 2>&1
npm run lint 2>&1
```
**실제 명령 출력 붙임.** "통과했음" 만 X.
실패 → 근본 원인 (표면 fix 금지).

### 7. Simplify (정리)
`simplify` skill 호출.

### 8. Advisor (큰 태스크)
2+ 파일 변경 or 아키텍처 결정 → `advisor()` 호출 완료 전.

## 자가 체크리스트

- [ ] Explore CBM 우선 썼음
- [ ] Test 먼저 작성. 실패 로그 있음
- [ ] 최소 구현. 추가 추상화 X
- [ ] Ripple 완료. 2+ 파일이면 ripple-checker 서브 위임
- [ ] typecheck / test / lint 실제 명령 실행. 출력 있음
- [ ] `any` / `as` / `enum` 안 씀
- [ ] 근본 원인 fix 이지 증상 가리기 X

## 안티패턴

- ❌ "테스트 통과할 겁니다" — 실행 안 함
- ❌ "타입 맞을 겁니다" — typecheck 안 돌림
- ❌ grep 세 번 → 파일 읽기 → 또 grep
- ❌ Read 로 큰 로그 컨텍스트 밀어넣기
- ❌ 실패 → try/catch 로 삼킴 (근본 원인 찾음)
