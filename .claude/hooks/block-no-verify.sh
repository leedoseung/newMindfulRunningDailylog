#!/bin/bash
# PreToolUse (Bash) — git 훅 우회 시도 차단

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

[ -z "$CMD" ] && exit 0

if echo "$CMD" | grep -qE '(git[[:space:]]+(commit|push|merge|rebase|am|cherry-pick)[[:space:]].*(-n[[:space:]]|--no-verify|--no-gpg-sign)|-c[[:space:]]+commit\.gpgsign=false|core\.hooksPath=)'; then
  jq -n --arg cmd "$CMD" '{
    decision: "block",
    reason: "❌ git 훅 우회 금지.\n\n명령: \($cmd)\n\n훅 실패 시 근본 원인 fix. 스킵 X.\n\n예외: 사용자가 명시적으로 우회 지시한 경우만."
  }'
  exit 0
fi

exit 0
