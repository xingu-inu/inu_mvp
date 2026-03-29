'use client'

import { usePostHog } from 'posthog-js/react'

const DEFAULT_ONBOARDING_V4_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_V4_DEFAULT === 'true'

export function useOnboardingV4Flag(): boolean {
  const posthog = usePostHog()
  const enabled = posthog?.isFeatureEnabled('onboarding_v4_enabled')

  if (typeof enabled === 'boolean') {
    return enabled
  }

  return DEFAULT_ONBOARDING_V4_ENABLED
}
