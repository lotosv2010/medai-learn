import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vibing Code 实践分享',
  description: 'Vibing Code 是一套 AI 协作工程实践——通过配置、流程、检查三个支柱，让 AI 从「随机生成」变成「可控生产力」。',
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
