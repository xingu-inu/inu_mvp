import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Script from 'next/script'
import { Providers } from '@/components/providers'
import { SkipLink } from '@/components/a11y'
import './globals.css'

export const metadata: Metadata = {
  title: 'inu - Life Roadmap & Goal Management',
  description: 'Create your life roadmap and manage goals within your time',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script src="/scripts/theme-init.js" strategy="beforeInteractive" nonce={nonce} />
      </head>
      <body className="font-sans antialiased">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
