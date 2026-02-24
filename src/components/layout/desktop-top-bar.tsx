'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SegmentControl } from './segment-control'
import { TopBarActions } from './top-bar-actions'

const navItems = [
  { href: '/home', label: '홈' },
  { href: '/roadmap', label: '로드맵' },
  { href: '/review', label: '회고' },
]

export function DesktopTopBar() {
  return (
    <header className="glass-3 sticky top-0 z-20 hidden h-14 items-center px-6 shadow-sm lg:flex">
      {/* Left: Logo */}
      <Link href="/home" className="mr-8 flex items-center">
        <Image src="/logo.png" alt="inu" width={28} height={28} />
      </Link>

      {/* Center: Segment Control */}
      <SegmentControl items={navItems} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Utility Icons */}
      <nav className="flex items-center gap-1" aria-label="보조 네비게이션">
        <TopBarActions />
      </nav>
    </header>
  )
}
