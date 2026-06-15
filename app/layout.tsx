import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leady — 독서로 언어 공부',
  description: 'AI가 만들어주는 맞춤형 이야기로 외국어를 배워요',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
