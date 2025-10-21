import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: '法学AI教学系统 | Legal Education Platform',
  description: 'AI-powered legal education platform with Socratic teaching methodology - 基于AI的法学教育平台，采用苏格拉底式教学法',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body id="RootLayoutId">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
