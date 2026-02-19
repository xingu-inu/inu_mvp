'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface LandingHeaderProps {
  transparent?: boolean
}

export function LandingHeader({ transparent = false }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!transparent) return

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [transparent])

  const isOpaque = !transparent || scrolled

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-50 transition-all duration-300',
        isOpaque
          ? 'glass-3 border-b border-[var(--color-border)]'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="inu" width={32} height={32} />
          <span className="text-base font-semibold text-[var(--color-text-primary)]">inu</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">시작하기</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
