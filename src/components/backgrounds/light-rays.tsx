'use client'

interface LightRaysProps {
  intensity?: 'subtle' | 'normal' | 'vivid'
}

const opacityMap = {
  subtle: 0.03,
  normal: 0.06,
  vivid: 0.1,
}

export function LightRays({ intensity = 'normal' }: LightRaysProps) {
  const opacity = opacityMap[intensity]

  const rays = [
    { left: 15, rotate: -15 },
    { left: 35, rotate: -10 },
    { left: 55, rotate: -5 },
    { left: 75, rotate: 0 },
  ]

  return (
    <div className="absolute inset-0">
      {rays.map((ray, i) => (
        <div
          key={i}
          className="animate-light-ray absolute top-0 h-full"
          style={{
            left: `${ray.left}%`,
            width: '60px',
            background: `linear-gradient(
              180deg,
              var(--color-water-ray) 0%,
              transparent 70%
            )`,
            transform: `rotate(${ray.rotate}deg)`,
            transformOrigin: 'top center',
            opacity,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  )
}
