#!/bin/bash
# Stop hook — Claude "완료" 선언 전 검증 강제
# 생성됨: install-harness (npm)

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

INPUT=$(cat)
ALREADY_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")

if [ "$ALREADY_ACTIVE" = "true" ]; then
  exit 0
fi

[ -f package.json ] || exit 0

if [ -d .git ]; then
  if git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
    exit 0
  fi
fi

FAILED=0
REASONS=()

if ! TC_OUT=$(npm run typecheck 2>&1); then
  FAILED=1
  REASONS+=("typecheck 실패:\n$(echo "$TC_OUT" | tail -20)")
fi

if ! T_OUT=$(npm test 2>&1); then
  FAILED=1
  REASONS+=("test 실패:\n$(echo "$T_OUT" | tail -30)")
fi

# Lint 은 advisory. Pre-commit 이 staged 파일 hard gate 담당.
# Baseline 존재 프로젝트에서 stop 시점 전체 lint 로 blocking 은 부적절.
# 하드 게이트 원하면 STOP_LINT_STRICT=1 로 강제 활성.
if [ "${STOP_LINT_STRICT:-0}" = "1" ]; then
  if ! LT_OUT=$(npm run lint 2>&1); then
    FAILED=1
    REASONS+=("lint 실패 (STOP_LINT_STRICT=1):\n$(echo "$LT_OUT" | tail -20)")
  fi
fi

if [ $FAILED -eq 1 ]; then
  REASON=$(printf '%s\n\n' "${REASONS[@]}")
  jq -n --arg r "$REASON" '{
    decision: "block",
    reason: "❌ 완료 X - 검증 실패:\n\n\($r)\n\n근본 원인 fix. 스킵 금지."
  }'
  exit 0
fi

exit 0
