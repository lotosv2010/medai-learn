#!/bin/bash
# medai-learn 项目初始化脚本
# 运行：bash scripts/setup.sh

set -e

echo "🚀 MedAI Learn 项目初始化..."
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ 需要 Node.js >= 20，当前版本: $(node --version 2>/dev/null || echo '未安装')"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
  echo "📦 安装 pnpm..."
  npm install -g pnpm@9
fi
echo "✅ pnpm $(pnpm --version)"

# 检查 Claude Code
if ! command -v claude &> /dev/null; then
  echo ""
  echo "⚠️  未检测到 Claude Code，请先安装："
  echo "   npm install -g @anthropic-ai/claude-code"
  echo ""
fi

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
pnpm install

# 创建环境变量文件
if [ ! -f ".env.local" ]; then
  echo ""
  echo "📝 创建 .env.local 模板..."
  cat > .env.local << 'EOF'
# ===== AI 模型 API Keys =====
# 至少配置一个，推荐先配 Anthropic（本项目使用 Claude Code）
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key
DASHSCOPE_API_KEY=your-dashscope-key   # 通义千问（国内备用）

# ===== 数据库 =====
# 本地开发用 Docker：docker-compose up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medai_dev
REDIS_URL=redis://localhost:6379

# ===== 认证 =====
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# ===== 应用配置 =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:3001
AI_ENGINE_URL=http://localhost:3002
EOF
  echo "✅ .env.local 已创建，请填入你的 API Keys"
fi

# 创建 .gitignore
cat > .gitignore << 'EOF'
# 依赖
node_modules/
.pnpm-store/

# 构建产物
.next/
dist/
.turbo/

# 环境变量（敏感信息）
.env
.env.local
.env.*.local

# 日志
*.log
docs/learning/sessions.log
docs/learning/edit-log.jsonl
docs/learning/questions.jsonl

# IDE
.DS_Store
.vscode/settings.json
.idea/

# 测试覆盖率
coverage/
EOF

# 给 hooks 文件添加执行权限
chmod +x .claude/hooks/*.sh 2>/dev/null || true

# 初始化学习进度（如果不存在）
if [ ! -f "docs/learning/progress.json" ]; then
  echo "📊 初始化学习进度文件..."
  mkdir -p docs/learning/notes
fi

# 创建 docker-compose（本地数据库）
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: medai_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

echo ""
echo "🎉 初始化完成！"
echo ""
echo "下一步："
echo "  1. 编辑 .env.local，填入你的 API Keys"
echo "  2. 启动数据库：docker-compose up -d"
echo "  3. 启动 Claude Code：claude"
echo "  4. 在 Claude Code 中：/learn 开始记录第一个知识点"
echo ""
echo "📚 推荐第一个任务："
echo "  让 Claude Code 帮你初始化 packages/shared 的 TypeScript 类型系统"
echo "  理解 Result<T, E> 模式和类型安全的错误处理"
echo ""
