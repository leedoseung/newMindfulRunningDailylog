#!/bin/bash
# PostToolUse — Edit/Write 후 typecheck + lint 자동
# 생성됨: install-harness (npm)

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[ -f package.json ] || exit 0

echo "" >&2
echo "🔍 post-edit-verify: $FILE_PATH" >&2

if ! TC_OUT=$(npm run typecheck 2>&1); then
  echo "❌ typecheck 실패:" >&2
  echo "$TC_OUT" | tail -30 >&2
else
  echo "✓ typecheck 통과" >&2
fi

if ! LT_OUT=$(npm run lint 2>&1); then
  echo "⚠️  lint 이슈:" >&2
  echo "$LT_OUT" | tail -20 >&2
else
  echo "✓ lint 통과" >&2
fi

exit 0
