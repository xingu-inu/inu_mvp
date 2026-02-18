'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  // 온보딩 완료 후 잔여 localStorage 정리
  useEffect(() => {
    if (user) {
      localStorage.removeItem('inu-onboarding')
    }
  }, [user])

  // 로딩 중
  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-500)]" />
        </div>
      )
    )
  }

  // 미인증 (리다이렉트 처리 중)
  if (!user) {
    return null
  }

  return <>{children}</>
}
