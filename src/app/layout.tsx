import type { Metadata } from 'next'
import Script from 'next/script'
import { Providers } from '@/components/providers'
import { SkipLink } from '@/components/a11y'
import './globals.css'

export const metadata: Metadata = {
  title: 'inu - Life Roadmap & Goal Management',
  description: 'Create your life roadmap and manage goals within your time',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
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
