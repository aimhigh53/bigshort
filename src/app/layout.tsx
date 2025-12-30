import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BigShort - 전문 경매 필터링 대시보드',
  description: '지방 대형 아파트 경매 물건 자동 필터링',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
