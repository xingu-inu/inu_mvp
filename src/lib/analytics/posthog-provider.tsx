'use client'

import posthog from 'posthog-js'
import { PostHogProvider, usePostHog } from 'posthog-js/react'
import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

function initPostHog(): void {
  if (typeof window === 'undefined' || !POSTHOG_KEY || posthog.__loaded) return

  posthog.init(POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
    autocapture: false,
  })
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!pathname || !ph) return

    let url = window.origin + pathname
    const search = searchParams?.toString()
    if (search) {
      url += '?' + search
    }

    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

function PostHogUserIdentify() {
  const ph = usePostHog()
  const identifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!ph) return

    const supabase = createClient()

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user && identifiedRef.current !== user.id) {
          ph.identify(user.id, { created_at: user.created_at })
          identifiedRef.current = user.id
        }
      })
      .catch(() => {
        // Silently ignore – onAuthStateChange listener handles identification as backup
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (identifiedRef.current !== session.user.id) {
          ph.identify(session.user.id, {
            created_at: session.user.created_at,
          })
          identifiedRef.current = session.user.id
        }
      } else if (event === 'SIGNED_OUT') {
        ph.reset()
        identifiedRef.current = null
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [ph])

  return null
}

export function PostHogAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef<boolean | null>(null)

  if (initialized.current == null) {
    initPostHog()
    initialized.current = true
  }

  if (!POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogUserIdentify />
      {children}
    </PostHogProvider>
  )
}
