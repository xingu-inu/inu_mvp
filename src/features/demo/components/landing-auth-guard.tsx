'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useUser } from '@/hooks/use-user'

/**
 * 클라이언트 라우터 캐시가 DemoApp을 서빙한 경우를 방어합니다.
 * proxy.ts는 서버 요청에만 실행되므로, 캐시 히트 시 우회됩니다.
 * 이 컴포넌트가 mount될 때 인증 상태를 확인하고, 로그인 상태이면 /home으로 리다이렉트합니다.
 */
export function LandingAuthGuard() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/roadmap')
    }
  }, [user, isLoading, router])

  return null
}
