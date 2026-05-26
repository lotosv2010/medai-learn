#!/usr/bin/env node
/**
 * SessionEnd Hook
 * 会话结束时：
 * 1. 读取本次编辑日志，生成会话摘要
 * 2. 提示用户更新学习进度
 */

const fs = require('fs');
const path = require('path');

const EDIT_LOG = 'docs/learning/edit-log.jsonl';
const PROGRESS_FILE = 'docs/learning/progress.json';

try {
  // 读取本次会话的编辑记录
  const logs = fs.existsSync(EDIT_LOG)
    ? fs.readFileSync(EDIT_LOG, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
    : [];

  // 获取最近 1 小时的记录（本次会话）
  const oneHourAgo = Date.now() - 3600 * 1000;
  const sessionLogs = logs.filter(l => new Date(l.timestamp).getTime() > oneHourAgo);
  
  if (sessionLogs.length === 0) {
    process.exit(0);
  }

  // 统计修改的模块
  const modules = [...new Set(sessionLogs.map(l => l.module))];
  const fileCount = sessionLogs.length;

  const summary = {
    type: 'text',
    text: `
📖 本次学习会话小结
------------------
修改文件：${fileCount} 个
涉及模块：${modules.join(', ')}

💾 记得更新你的学习笔记！运行：
   /learn <你今天学到的知识点>

📊 更新学习进度：
   编辑 docs/learning/progress.json 中的 completedTopics
`
  };

  process.stdout.write(JSON.stringify(summary));
} catch (e) {
  process.exit(0);
}
