import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-6xl font-bold text-[var(--color-primary-500)]">404</h1>
      <h2 className="mb-2 text-xl font-semibold">페이지를 찾을 수 없어요</h2>
      <p className="mb-6 text-center text-[var(--color-text-secondary)]">
        요청하신 페이지가 존재하지 않거나 이동되었어요.
      </p>
      <Link
        href="/roadmap"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--color-primary-500)] px-4 text-base font-semibold text-white transition-all hover:bg-[var(--color-primary-600)]"
      >
        메인으로 돌아가기
      </Link>
    </div>
  )
}
