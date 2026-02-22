'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { getActiveAnnouncements } from '@/actions/announcement.actions'
import type { Announcement } from '@/repositories/announcement.repository'

/**
 * 활성 공지사항 조회 (사용자용)
 */
export function useActiveAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: queryKeys.announcements.active,
    queryFn: async () => {
      const res = await getActiveAnnouncements()
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ANNOUNCEMENTS,
    refetchOnWindowFocus: true,
  })
}
