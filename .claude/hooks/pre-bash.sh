#!/bin/bash
# PreToolUse Hook - Bash 命令执行前安全检查
# 阻止危险命令，保护学习环境

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log(d.tool_input?.command || '');
" 2>/dev/null || echo "")

# 危险命令黑名单
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "DROP DATABASE"
  "DROP TABLE"
  "truncate"
  "> /dev/sda"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo '{"decision":"block","reason":"检测到危险命令，已阻止执行。请确认操作后手动执行。"}'
    exit 0
  fi
done

# 正常通过
exit 0
