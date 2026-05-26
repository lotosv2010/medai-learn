#!/bin/bash
# PostToolUse Hook - 文件编辑后自动执行
# 触发条件：Write / Edit / MultiEdit 工具调用后
# 
# 从 stdin 读取 JSON，包含编辑的文件信息
# 格式：{ "tool_name": "Write", "tool_input": { "file_path": "..." }, ... }

set -e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf-8'));
const p = data.tool_input?.file_path || data.tool_input?.path || '';
console.log(p);
" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 只处理 TypeScript / JavaScript 文件
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx|mts|cts)$ ]]; then
  exit 0
fi

echo "🔍 正在检查: $FILE_PATH"

# 1. 格式化（Prettier）
if command -v prettier &> /dev/null; then
  prettier --write "$FILE_PATH" 2>/dev/null && echo "✅ 格式化完成"
fi

# 2. ESLint 检查（只检查修改的文件，快速）
if command -v eslint &> /dev/null; then
  if eslint "$FILE_PATH" --max-warnings=0 2>/dev/null; then
    echo "✅ ESLint 通过"
  else
    echo "⚠️  ESLint 发现问题，请检查（不阻断流程）"
  fi
fi

# 3. TypeScript 类型检查（针对所属包，增量）
PACKAGE_DIR=""
if [[ "$FILE_PATH" =~ apps/web ]]; then
  PACKAGE_DIR="apps/web"
elif [[ "$FILE_PATH" =~ apps/api ]]; then
  PACKAGE_DIR="apps/api"
elif [[ "$FILE_PATH" =~ apps/ai-engine ]]; then
  PACKAGE_DIR="apps/ai-engine"
elif [[ "$FILE_PATH" =~ packages/shared ]]; then
  PACKAGE_DIR="packages/shared"
elif [[ "$FILE_PATH" =~ packages/ui ]]; then
  PACKAGE_DIR="packages/ui"
elif [[ "$FILE_PATH" =~ packages/ai-sdk ]]; then
  PACKAGE_DIR="packages/ai-sdk"
fi

if [ -n "$PACKAGE_DIR" ] && [ -f "$PACKAGE_DIR/tsconfig.json" ]; then
  if cd "$PACKAGE_DIR" && npx tsc --noEmit 2>/dev/null; then
    echo "✅ TypeScript 类型检查通过"
  else
    echo "⚠️  TypeScript 类型错误，建议修复"
    # 不 exit 1，不阻断 Claude 的工作流
  fi
  cd - > /dev/null
fi

# 4. 自动记录学习日志（当文件是新功能时）
node -e "
const fs = require('fs');
const path = require('path');
const filePath = '$FILE_PATH';
const logFile = 'docs/learning/edit-log.jsonl';

const entry = {
  timestamp: new Date().toISOString(),
  file: filePath,
  ext: path.extname(filePath),
  module: filePath.split('/')[1] || 'root'
};

try {
  fs.mkdirSync('docs/learning', { recursive: true });
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
} catch(e) {}
" 2>/dev/null

echo "✨ 检查完成"
