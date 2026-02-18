import type { Metadata } from 'next'
import Script from 'next/script'
import { Noto_Serif_KR } from 'next/font/google'
import { Providers } from '@/components/providers'
import { SkipLink } from '@/components/a11y'
import './globals.css'

const notoSerifKr = Noto_Serif_KR({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'inu - Life Roadmap & Goal Management',
  description: 'Create your life roadmap and manage goals within your time',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={notoSerifKr.variable}>
      <head>
        <Script src="/scripts/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="font-sans antialiased">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
