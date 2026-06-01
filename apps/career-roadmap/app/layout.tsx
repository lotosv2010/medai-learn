import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 工程师职业路线图 · 前端10年老兵的系统学习手册',
  description: '基于 10 年前端经验 + 医疗电商背景 + 当前 AI 就业市场的综合分析',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
