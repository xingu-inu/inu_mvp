'use client'

import { usePostHog } from 'posthog-js/react'

const DEFAULT_ONBOARDING_V5_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_V5_DEFAULT === 'true'

export function useOnboardingV5Flag(): boolean {
  const posthog = usePostHog()
  const enabled = posthog?.isFeatureEnabled('onboarding_v5_enabled')

  if (typeof enabled === 'boolean') {
    return enabled
  }

  return DEFAULT_ONBOARDING_V5_ENABLED
}
