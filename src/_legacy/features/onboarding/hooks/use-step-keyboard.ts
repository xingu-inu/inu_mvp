'use client'

import { useEffect } from 'react'

interface UseStepKeyboardOptions {
  onNext?: () => void
  onBack?: () => void
  canProceed: boolean
}

/**
 * Keyboard navigation for onboarding steps.
 * Enter → next step (when valid), Escape → previous step.
 */
export function useStepKeyboard({ onNext, onBack, canProceed }: UseStepKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Only allow Enter in inputs if it's not a textarea (textarea needs Enter for newlines)
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA' && canProceed && onNext) {
          e.preventDefault()
          onNext()
        }
        return
      }

      if (e.key === 'Enter' && canProceed && onNext) {
        e.preventDefault()
        onNext()
      }
      if (e.key === 'Escape' && onBack) {
        e.preventDefault()
        onBack()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNext, onBack, canProceed])
}
