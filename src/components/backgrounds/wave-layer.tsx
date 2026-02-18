'use client'

interface WaveLayerProps {
  position?: 'top' | 'bottom'
  animate?: boolean
}

export function WaveLayer({ position = 'top', animate = true }: WaveLayerProps) {
  const animationClass = animate ? 'animate-wave-sway' : ''
  const positionClass = position === 'top' ? 'top-0' : 'bottom-0'
  const isBottom = position === 'bottom'

  // Bottom wave: curve goes UP into viewport (smaller y = higher on screen)
  // Top wave: curve goes DOWN into viewport (larger y = lower on screen)
  const bottomPath = 'M0,120 L0,70 C240,50 480,90 720,60 C960,30 1200,80 1440,55 L1440,120 Z'
  const topPath = 'M0,60 C240,80 480,40 720,60 C960,80 1200,40 1440,55 L1440,120 L0,120 Z'

  return (
    <div className={`absolute ${positionClass} right-0 left-0 h-32 ${animationClass}`}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="h-full w-full"
        style={{ opacity: isBottom ? 0.3 : 0.15 }}
      >
        <path
          d={isBottom ? bottomPath : topPath}
          fill={isBottom ? 'var(--color-water-deep)' : 'var(--color-water-medium)'}
        />
      </svg>
    </div>
  )
}

export function WaveLayerBottom({ animate = true }: { animate?: boolean }) {
  const animationClass = animate ? 'animate-wave-sway-delayed' : ''

  return (
    <div className={`absolute right-0 bottom-0 left-0 h-16 ${animationClass}`}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="h-full w-full rotate-180"
        style={{ opacity: 0.1 }}
      >
        <path
          d="M0,90 C360,70 540,100 900,85 C1260,70 1380,95 1440,90 L1440,120 L0,120 Z"
          fill="var(--color-water-deep)"
        />
      </svg>
    </div>
  )
}
