'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Sun,
  Moon,
  Monitor,
  Shield,
  ChevronRight,
  LogOut,
  Compass,
  MessageSquare,
  LayoutDashboard,
  User,
} from 'lucide-react'
import { useTheme } from '@/components/providers'
import { cn } from '@/lib/utils'
import { useProfile } from '@/queries/use-profile'
import { useNotificationCount } from '@/queries/use-notifications'
import { signOut } from '@/actions/auth.actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { ProfileModal } from '@/components/layout/profile/profile-modal'
import { AvatarUpload } from '@/components/layout/profile/avatar-upload'
import type { ModalView } from '@/components/layout/profile/profile-modal'

const themeOptions = [
  { value: 'light' as const, icon: Sun, label: '라이트' },
  { value: 'dark' as const, icon: Moon, label: '다크' },
  { value: 'system' as const, icon: Monitor, label: '시스템' },
]

export default function MorePage() {
  const { theme, setTheme } = useTheme()
  const { data: profile } = useProfile()
  const badgeCount = useNotificationCount()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileInitialView, setProfileInitialView] = useState<ModalView>('main')

  const displayName = profile?.name || '사용자'
  const displayEmail = profile?.email || ''

  const openProfileAt = (view: ModalView) => {
    setProfileInitialView(view)
    setProfileOpen(true)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    trackEvent(ANALYTICS_EVENTS.AUTH_LOGOUT)
    await signOut()
  }

  const settingsLinks: { view: ModalView; icon: typeof Bell; label: string }[] = [
    { view: 'companion', icon: Compass, label: '나에 대한 데이터' },
    { view: 'feedback', icon: MessageSquare, label: '의견 보내기' },
    { view: 'notifications', icon: Bell, label: '알림 설정' },
    { view: 'privacy', icon: Shield, label: '개인정보 보호' },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Profile Header */}
      <div className="text-center">
        <AvatarUpload avatarUrl={profile?.avatar_url} name={displayName} />
        <p className="mt-3 text-lg font-bold">{displayName}</p>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{displayEmail}</p>
      </div>

      <div className="mt-6 space-y-2">
        {/* Notifications Link */}
        <Link
          href="/more/notifications"
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-[var(--color-text-secondary)]" />
            <span className="text-sm">알림</span>
          </div>
          <div className="flex items-center gap-2">
            {badgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-streak)] px-1.5 text-[10px] font-bold text-white">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </div>
        </Link>

        {/* Profile Edit */}
        <button
          onClick={() => openProfileAt('main')}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-[var(--color-text-secondary)]" />
            <span className="text-sm">프로필 편집</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        </button>

        {/* Admin Link */}
        {profile?.is_admin && (
          <Link
            href="/admin"
            className="flex w-full items-center justify-between rounded-xl bg-[var(--color-primary-50)] px-3 py-3 transition-colors hover:bg-[var(--color-primary-100)]"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5 text-[var(--color-primary-500)]" />
              <span className="text-sm font-medium text-[var(--color-primary-600)]">
                Admin Dashboard
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--color-primary-400)]" />
          </Link>
        )}
      </div>

      {/* Settings Section */}
      <div className="mt-6 space-y-1">
        <p className="mb-2 px-3 text-sm font-medium text-[var(--color-text-secondary)]">설정</p>
        {settingsLinks.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => openProfileAt(view)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
              <span className="text-sm">{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </button>
        ))}
      </div>

      {/* Theme Toggle */}
      <div className="mt-6 space-y-2 px-3">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">화면 모드</p>
        <div className="flex gap-1 rounded-xl bg-[var(--color-bg-secondary)] p-1">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
                theme === value
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-primary-500)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <div className="mt-8 px-3">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-miss)] transition-colors hover:bg-[var(--color-danger-hover-bg)] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>

      {/* Profile Modal (reuse existing) */}
      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        initialView={profileInitialView}
      />
    </div>
  )
}
