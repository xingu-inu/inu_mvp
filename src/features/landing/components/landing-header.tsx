import Link from 'next/link'
import Image from 'next/image'

import { Button } from '@/components/ui'

export function LandingHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="inu" width={32} height={32} />
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
