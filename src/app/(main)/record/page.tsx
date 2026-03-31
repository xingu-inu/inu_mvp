import type { Metadata } from 'next'
import { RecordPageClient } from '@/features/record'

export const metadata: Metadata = {
  title: '기록',
}

export default function RecordPage() {
  return (
    <main className="h-full bg-[var(--color-bg-primary)]">
      <RecordPageClient />
    </main>
  )
}
