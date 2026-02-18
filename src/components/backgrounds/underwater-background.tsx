'use client'

import { useReducedMotion } from '@/hooks'
import { WaveLayer } from './wave-layer'
import { BubbleParticles } from './bubble-particles'

interface UnderwaterBackgroundProps {
  children: React.ReactNode
  showBubbles?: boolean
  showWaves?: boolean
  className?: string
}

export function UnderwaterBackground({
  children,
  showBubbles = true,
  showWaves = true,
  className = '',
}: UnderwaterBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = !prefersReducedMotion

  return (
    <div className={`underwater-bg relative min-h-screen ${className}`}>
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Subtle wave at bottom */}
        {showWaves && <WaveLayer position="bottom" animate={shouldAnimate} />}

        {/* Few subtle bubbles */}
        {showBubbles && shouldAnimate && <BubbleParticles count={5} />}
      </div>

      {/* Content layer */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
