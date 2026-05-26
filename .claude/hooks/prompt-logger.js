#!/usr/bin/env node
/**
 * UserPromptSubmit Hook
 * 记录学习相关的问题，建立个人知识库
 */

const fs = require('fs');

const INPUT = JSON.parse(fs.readFileSync('/dev/stdin', 'utf-8'));
const prompt = INPUT.prompt || '';

// 只记录带有学习关键词的 prompt
const learningKeywords = ['为什么', '原理', '区别', '如何', '实现', '理解', 'why', 'how', 'what is', '怎么', '讲一下'];
const isLearningQuery = learningKeywords.some(kw => prompt.toLowerCase().includes(kw));

if (isLearningQuery) {
  try {
    fs.mkdirSync('docs/learning', { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      question: prompt.slice(0, 200) // 截取前 200 字符
    };
    fs.appendFileSync('docs/learning/questions.jsonl', JSON.stringify(entry) + '\n');
  } catch (e) {}
}

process.exit(0);
