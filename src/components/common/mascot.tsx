'use client'

import Image from 'next/image'

export type MascotMood =
  | 'happy'
  | 'proud'
  | 'sleepy'
  | 'encouraging'
  | 'celebrating'
  | 'checkin'
  | 'empty'

type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAP: Record<MascotSize, number> = {
  xs: 32,
  sm: 48,
  md: 80,
  lg: 120,
  xl: 160,
}

interface MascotProps {
  mood: MascotMood
  size?: MascotSize
  className?: string
  alt?: string
}

export function Mascot({ mood, size = 'md', className, alt }: MascotProps) {
  const px = SIZE_MAP[size]

  return (
    <Image
      src={`/mascot/${mood}.png`}
      alt={alt ?? `inu mascot - ${mood}`}
      width={px}
      height={px}
      className={className}
      priority={false}
    />
  )
}
