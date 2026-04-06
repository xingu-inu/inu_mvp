'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollY } from '@/hooks/use-scroll-y'
import { TopBarActions } from './top-bar-actions'

interface TopBarProps {
  variant?: 'main' | 'secondary' | 'transparent'
  title?: string
  showBackButton?: boolean
  rightActions?: React.ReactNode
}

export function TopBar({
  variant = 'main',
  title,
  showBackButton = false,
  rightActions,
}: TopBarProps) {
  const router = useRouter()
  const { scrollY } = useScrollY()

  // transparent variant: 스크롤 시 배경 전환
  const isScrolled = scrollY > 10

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b transition-all duration-200',
        'pt-[env(safe-area-inset-top)]',
        variant === 'transparent' && !isScrolled
          ? 'border-transparent bg-transparent'
          : 'glass-3 border-[var(--color-border)]'
      )}
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        {/* Left Section */}
        {showBackButton ? (
          <button
            onClick={() => router.back()}
            className="-ml-2 rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
            aria-label="뒤로 가기"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : variant === 'main' ? (
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="inu" width={28} height={28} />
          </Link>
        ) : (
          <div className="w-10" />
        )}

        {/* Center Title (secondary variant) */}
        {variant === 'secondary' && title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">{title}</h1>
        )}

        {/* Right Section */}
        {rightActions ||
          (variant === 'main' && (
            <nav className="flex items-center gap-1" aria-label="보조 네비게이션">
              <TopBarActions />
            </nav>
          ))}
        {variant === 'secondary' && !rightActions && <div className="w-10" />}
      </div>
    </header>
  )
}
