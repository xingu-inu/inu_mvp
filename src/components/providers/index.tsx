'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from 'sonner'
import { ThemeProvider } from './theme-provider'
import { PostHogAnalyticsProvider } from '@/lib/analytics'
import { createQueryClient } from '@/lib/query/config'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <PostHogAnalyticsProvider>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <ThemeProvider>{children}</ThemeProvider>
        </NuqsAdapter>
        <Toaster richColors position="bottom-center" style={{ fontFamily: 'var(--font-sans)' }} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </PostHogAnalyticsProvider>
  )
}

export { useTheme } from './theme-provider'
