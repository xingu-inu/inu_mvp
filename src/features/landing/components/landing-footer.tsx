import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-sm text-[var(--color-text-tertiary)]">
              &copy; {new Date().getFullYear()} inu. All rights reserved.
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              운영자: 오준영 | 문의: ohxingu@gmail.com
            </p>
          </div>
          <div className="flex gap-6 text-sm text-[var(--color-text-secondary)]">
            <Link href="/terms" className="hover:text-[var(--color-text-primary)]">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-[var(--color-text-primary)]">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
