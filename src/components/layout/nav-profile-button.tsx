'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useProfile } from '@/queries/use-profile'
import { queryKeys } from '@/lib/query/keys'

interface NavProfileButtonProps {
  onClick: () => void
}

export function NavProfileButton({ onClick }: NavProfileButtonProps) {
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const avatarUrl = profile?.avatar_url || null

  // Prefetch direction data on hover so the modal opens instantly
  const handleMouseEnter = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.direction.all,
    })
  }, [queryClient])

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      aria-label="프로필"
      className={cn(
        'relative flex-shrink-0 rounded-full transition-all',
        avatarUrl
          ? 'h-8 w-8 overflow-hidden ring-2 ring-transparent hover:ring-[var(--color-primary-300)]'
          : 'rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
      )}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={profile?.name || '프로필'}
          fill
          className="object-cover"
          sizes="32px"
        />
      ) : (
        <User className="h-5 w-5" />
      )}
    </button>
  )
}
