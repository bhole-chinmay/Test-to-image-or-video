import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PromptFrame — Prompt to Image & Video',
  description: 'Generate images or videos from a text prompt. Auto-detects still vs motion.',
  generator: 'PromptFrame',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f7f4ef',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
