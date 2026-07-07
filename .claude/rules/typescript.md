---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/tsconfig*.json"
---
Invoke `dev-flow` skill FIRST. No skip.

Self-check before returning:
1. no `any` — use `unknown` + narrow, or 정확한 타입
2. no `as` cast — type guard (`instanceof`, `in`, discriminated union)
3. no `enum` — `as const` object: `const Status = { OPEN: 'open' } as const`
4. discriminated union for state — never optional fields sometimes-set
5. `import type { Foo }` for type-only imports
6. 새 함수 → 실패 테스트 먼저 → green → refactor
7. 변경 심볼 → `trace_path(direction=inbound)` 모든 caller 업데이트
8. `typecheck` 실제 실행. 출력 로그 있음
9. `test` 실제 실행. 출력 로그 있음
10. `Promise` 반환 → `await` 확인
