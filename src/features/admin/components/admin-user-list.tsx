'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAdminUsers } from '../hooks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

export function AdminUserList() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: allUsers, isLoading } = useAdminUsers({ search, page })

  // Client-side pagination over the returned array
  const users = useMemo(() => {
    if (!allUsers) return []
    const start = page * PAGE_SIZE
    return allUsers.slice(start, start + PAGE_SIZE)
  }, [allUsers, page])

  const totalCount = allUsers?.length ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/admin/users/${id}`)
    },
    [router]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">사용자 관리</h1>
        <span className="text-sm text-[var(--color-text-tertiary)]">
          총 {totalCount.toLocaleString()}명
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="이름 또는 이메일로 검색..."
          className="pl-10"
        />
      </div>

      {/* User Table */}
      <Card padding="none" className="overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1.5fr_auto_auto_auto_auto] gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-xs font-medium text-[var(--color-text-tertiary)]">
          <span>사용자</span>
          <span>이메일</span>
          <span className="text-center">가입일</span>
          <span className="text-center">최근 활동</span>
          <span className="text-center">목표</span>
          <span className="text-center">관리자</span>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1.5fr_auto_auto_auto_auto] gap-4 px-4 py-3"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--color-text-tertiary)]">
            {search ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleRowClick(user.id)}
                className="grid w-full grid-cols-[1fr_1.5fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-hover)]"
              >
                {/* Name + Avatar */}
                <div className="flex items-center gap-3 truncate">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-sm font-medium text-[var(--color-primary-500)]">
                      {(user.name ?? user.email)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {user.name ?? '-'}
                  </span>
                </div>

                {/* Email */}
                <span className="truncate text-sm text-[var(--color-text-secondary)]">
                  {user.email}
                </span>

                {/* Join Date */}
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {format(new Date(user.created_at), 'yy.MM.dd', { locale: ko })}
                </span>

                {/* Last Active */}
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {user.lastActive
                    ? format(new Date(user.lastActive), 'yy.MM.dd', { locale: ko })
                    : '-'}
                </span>

                {/* Goals */}
                <span className="text-center text-sm text-[var(--color-text-secondary)]">
                  {user.goalCount ?? 0}
                </span>

                {/* Admin Badge */}
                <span className="flex justify-center">
                  {user.is_admin && <Shield className="h-4 w-4 text-[var(--color-primary-500)]" />}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            이전
          </Button>
          <span className="px-3 text-sm text-[var(--color-text-secondary)]">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
