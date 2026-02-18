'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/queries/use-profile'
import { Loader2 } from 'lucide-react'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !profile?.is_admin) {
      router.replace('/home')
    }
  }, [profile, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-500)]" />
      </div>
    )
  }

  if (!profile?.is_admin) return null

  return <>{children}</>
}
