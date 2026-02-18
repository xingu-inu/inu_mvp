'use client'

import { useState, useEffect } from 'react'

interface BubbleParticlesProps {
  count?: number
}

interface Bubble {
  id: number
  size: number
  left: number
  duration: number
  delay: number
}

// Generate a seeded random number for consistent bubbles
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateBubbles(count: number): Bubble[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 1000
    return {
      id: i,
      size: 3 + seededRandom(seed + 1) * 4, // 3-7px (smaller)
      left: 15 + seededRandom(seed + 2) * 70, // 15-85% from left
      duration: 10 + seededRandom(seed + 3) * 6, // 10-16s (slower)
      delay: seededRandom(seed + 4) * 8, // 0-8s delay (more spread)
    }
  })
}

export function BubbleParticles({ count = 8 }: BubbleParticlesProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>(() => generateBubbles(count))

  useEffect(() => {
    setBubbles(generateBubbles(count))
  }, [count])

  return (
    <>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="animate-bubble-float absolute rounded-full"
          style={
            {
              width: bubble.size,
              height: bubble.size,
              left: `${bubble.left}%`,
              bottom: 0,
              background: 'var(--color-water-bubble)',
              '--bubble-duration': `${bubble.duration}s`,
              '--bubble-delay': `${bubble.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}
