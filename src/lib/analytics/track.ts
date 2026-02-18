'use client'

import posthog from 'posthog-js'

import type { AnalyticsEvent } from './events'

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(event, properties)
  }
}
