# new-daily-mindful-running-app — Project Rules

개인 하네스 이식. Claude Code 위 결정론적 품질 게이트.

## Stack
- Package manager: **npm**
- Framework: Next.js

## Mandatory Workflow

매 코드 작업 시:

1. **Skill gate** — `dev-flow` skill FIRST.
2. **Explore** — CBM 우선 (`search_graph`, `trace_path`, `get_code_snippet`). grep 폴백만.
3. **Clarify** — 애매하면 `AskUserQuestion`. 추측 X.
4. **Plan** — non-trivial → `EnterPlanMode`.
5. **TDD** — 실패 테스트 먼저 → 최소 구현 → refactor.
6. **Ripple** — 2+ 파일 변경 시 `ripple-checker` 서브에이전트 위임.
7. **Verify** — 증거 없이 완료 선언 X.
8. **Simplify** — 후처리로 `simplify` skill 호출.

## Verification Commands
```bash
npm run typecheck
npm test
npm run lint
```

## Hard Rules

- ❌ `any` 사용 (`unknown` + narrow)
- ❌ `as` 캐스트 (type guard 씀)
- ❌ `enum` (`as const` object)
- ❌ 테스트 없이 커밋
- ❌ 훅 스킵 (`--no-verify`, `--no-gpg-sign`)
- ❌ 근본 원인 없이 fix (증상만 가리기)
- ❌ 원시 로그를 컨텍스트에 넣기 (`ctx_execute` 로 처리)
- ❌ 시크릿 하드코딩 (전역 훅이 block)

## Ripple Check (강제)

symbol 추가/변경/제거 시:
1. `search_code` 로 문자열 매칭
2. `trace_path(direction=inbound)` 로 모든 caller
3. 모든 호출부 업데이트
4. 2+ 파일 걸치면 `ripple-checker` 서브 위임

## Git Commit 규칙

**Conventional Commits (commit-msg 훅 강제):**
- `<type>(<scope>?)!?: <subject>`
- type: `feat|fix|docs|refactor|test|chore|perf|build|ci|revert|style`
- 첫 줄 72자 이하

**pre-commit 훅:**
1. Lint (staged 파일)
2. `npm run typecheck` 전체
3. Changed 관련 테스트
4. 시크릿 스캔
