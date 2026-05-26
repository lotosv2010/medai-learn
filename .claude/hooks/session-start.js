#!/usr/bin/env node
/**
 * SessionStart Hook
 * 每次启动 Claude Code 时自动执行：
 * 1. 读取学习进度
 * 2. 更新 CLAUDE.md 中的学习重点
 * 3. 输出今日学习建议
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PROGRESS_FILE = path.join(ROOT, 'docs/learning/progress.json');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');
const SESSION_LOG = path.join(ROOT, 'docs/learning/sessions.log');

// 读取学习进度
function getProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return getDefaultProgress();
  }
}

function getDefaultProgress() {
  return {
    currentPhase: 1,
    currentWeek: 1,
    completedTopics: [],
    inProgressTopics: ['Monorepo 初始化', 'TypeScript 类型系统'],
    lastSession: null,
    totalSessionCount: 0,
    notes: []
  };
}

// 生成学习建议
function getLearningTip(progress) {
  const tips = {
    1: [
      '💡 今日重点：理解 pnpm workspace 与 npm workspace 的区别',
      '💡 挑战：手写一个简单的 EventEmitter，理解发布订阅模式',
      '💡 深挖：TypeScript 的 infer 关键字是如何工作的？',
      '💡 实践：给 packages/shared 添加一个带有泛型约束的 Result<T, E> 类型'
    ],
    2: [
      '💡 今日重点：理解 React Fiber 的双缓冲机制',
      '💡 挑战：用 useReducer 重写一个复杂的 useState 状态',
      '💡 深挖：SSE 和 WebSocket 在 AI 流式输出场景的选型依据',
      '💡 实践：实现一个支持 abort 的 useFetch hook'
    ],
    3: [
      '💡 今日重点：Embedding 的余弦相似度原理',
      '💡 挑战：手动实现一个简单的向量相似度搜索',
      '💡 深挖：RAG 的 chunk 分块策略对检索质量的影响',
      '💡 实践：为药品说明书实现一个分块策略对比实验'
    ]
  };
  const phaseTips = tips[progress.currentPhase] || tips[1];
  return phaseTips[Math.floor(Math.random() * phaseTips.length)];
}

// 更新 CLAUDE.md 的学习重点区域
function updateClaudeMd(progress) {
  try {
    let content = fs.readFileSync(CLAUDE_MD, 'utf-8');
    const focusSection = `当前阶段：Phase ${progress.currentPhase} - ${getPhaseTitle(progress.currentPhase)}
重点知识：${progress.inProgressTopics.slice(0, 2).join(' + ')}
已完成：${progress.completedTopics.length} 个知识点
本周目标：${getWeeklyGoal(progress)}
上次学习：${progress.lastSession || '首次启动'}`;

    content = content.replace(
      /<!-- LEARNING_FOCUS_START -->[\s\S]*?<!-- LEARNING_FOCUS_END -->/,
      `<!-- LEARNING_FOCUS_START -->\n${focusSection}\n<!-- LEARNING_FOCUS_END -->`
    );
    fs.writeFileSync(CLAUDE_MD, content);
  } catch (e) {
    // 非阻塞，失败不影响主流程
  }
}

function getPhaseTitle(phase) {
  const titles = { 1: '基础搭建', 2: 'AI 核心', 3: '全栈完善', 4: '工程化提升' };
  return titles[phase] || '学习中';
}

function getWeeklyGoal(progress) {
  const goals = {
    1: '完成 packages/shared 的类型定义层 + 认证系统',
    2: '接入 LLM API，实现第一个流式对话界面',
    3: '完成 RAG 药品说明书搜索系统',
    4: 'CI/CD 流水线上线'
  };
  return goals[progress.currentPhase] || '持续推进';
}

// 记录会话日志
function logSession(progress) {
  try {
    const now = new Date().toISOString();
    const log = `[${now}] Session #${progress.totalSessionCount + 1} | Phase ${progress.currentPhase} | In Progress: ${progress.inProgressTopics.join(', ')}\n`;
    fs.appendFileSync(SESSION_LOG, log);

    // 更新进度文件
    progress.lastSession = now;
    progress.totalSessionCount += 1;
    fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (e) {
    // 非阻塞
  }
}

// 主执行
const progress = getProgress();
updateClaudeMd(progress);
logSession(progress);

const tip = getLearningTip(progress);
const output = {
  type: 'text',
  text: `
🎯 MedAI Learn — 学习助手已就绪

📊 学习进度：Phase ${progress.currentPhase} | 已完成 ${progress.completedTopics.length} 个知识点
📝 当前攻关：${progress.inProgressTopics.join('、')}
🔥 Session #${progress.totalSessionCount + 1}

${tip}

---
提示：使用 /learn 记录知识点，/quiz 自测，/explain 深入理解当前代码
`
};

// 输出给 Claude Code（写入 stdout）
process.stdout.write(JSON.stringify(output));
