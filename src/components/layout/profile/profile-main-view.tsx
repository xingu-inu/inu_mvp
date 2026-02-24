'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Shield,
  ChevronRight,
  LogOut,
  Compass,
  Pencil,
  Check,
  X,
  MessageSquare,
  LayoutDashboard,
} from 'lucide-react'
import { useTheme } from '@/components/providers'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile } from '@/queries/use-profile'
import { useDirection, useUpdateDirection } from '@/queries/use-direction'
import { signOut } from '@/actions/auth.actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { GoogleCalendarConnect } from '@/features/profile/components/google-calendar-connect'
import { ModalBody } from '@/components/ui/responsive-modal'
import { AvatarUpload } from './avatar-upload'
import type { ModalView } from './profile-modal'

const themeOptions = [
  { value: 'light' as const, icon: Sun, label: '라이트' },
  { value: 'dark' as const, icon: Moon, label: '다크' },
  { value: 'system' as const, icon: Monitor, label: '시스템' },
]

function DirectionSection({
  direction,
  isLoading,
}: {
  direction: { id: string; statement: string } | null | undefined
  isLoading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const updateDirection = useUpdateDirection()

  const handleEdit = () => {
    setValue(direction?.statement ?? '')
    setEditing(true)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(value.length, value.length)
      }
    }, 0)
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || !direction || trimmed === direction.statement) {
      setEditing(false)
      return
    }
    await updateDirection.mutateAsync({
      id: direction.id,
      input: { statement: trimmed },
    })
    setEditing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">나의 방향</p>
        </div>
        <div className="animate-pulse rounded-xl bg-[var(--color-bg-secondary)] p-3">
          <div className="h-4 w-3/4 rounded bg-[var(--color-bg-tertiary)]" />
          <div className="mt-1.5 h-4 w-1/2 rounded bg-[var(--color-bg-tertiary)]" />
        </div>
      </div>
    )
  }

  if (!direction) return null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">나의 방향</p>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={updateDirection.isPending}
              className="rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <button onClick={handleEdit} className="group w-full text-left">
          <div className="relative rounded-xl bg-[var(--color-bg-secondary)] p-3 transition-colors hover:bg-[var(--color-bg-tertiary)]">
            <p className="pr-6 text-sm leading-relaxed text-[var(--color-text-primary)]">
              {direction.statement}
            </p>
            <Pencil className="absolute top-3 right-3 h-3.5 w-3.5 text-[var(--color-text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
      )}
    </div>
  )
}

export function ProfileMainView({
  onNavigate,
  onClose,
}: {
  onNavigate: (view: ModalView) => void
  onClose: () => void
}) {
  const { theme, setTheme } = useTheme()
  const { data: profile } = useProfile()
  const { data: direction, isLoading: directionLoading } = useDirection()
  const updateProfile = useUpdateProfile()
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Inline name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const displayName = profile?.name || '사용자'
  const displayEmail = profile?.email || ''

  const handleNameEdit = () => {
    setNameValue(displayName)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleNameSave = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === displayName) {
      setEditingName(false)
      return
    }
    await updateProfile.mutateAsync({ name: trimmed })
    setEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave()
    if (e.key === 'Escape') setEditingName(false)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    onClose()
    trackEvent(ANALYTICS_EVENTS.AUTH_LOGOUT)
    await signOut()
  }

  const settingsLinks: { view: ModalView; icon: typeof Bell; label: string }[] = [
    { view: 'feedback', icon: MessageSquare, label: '의견 보내기' },
    { view: 'notifications', icon: Bell, label: '알림 설정' },
    { view: 'privacy', icon: Shield, label: '개인정보 보호' },
  ]

  return (
    <ModalBody>
      {/* Profile Header */}
      <div className="text-center">
        <AvatarUpload avatarUrl={profile?.avatar_url} name={displayName} />
        {editingName ? (
          <div className="mx-auto mt-3 flex max-w-[200px] items-center gap-1">
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameSave}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 text-center text-lg font-bold outline-none"
            />
            <button
              onClick={handleNameSave}
              className="rounded-md p-1 text-[var(--color-primary-500)] hover:bg-[var(--color-bg-secondary)]"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleNameEdit} className="group mt-3 inline-flex items-center gap-1">
            <span className="text-lg font-bold">{displayName}</span>
            <Pencil className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{displayEmail}</p>
      </div>

      {/* Direction */}
      <DirectionSection direction={direction} isLoading={directionLoading} />

      {/* Theme Toggle */}
      <div className="space-y-2">
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

      {/* Admin Link */}
      {profile?.is_admin && (
        <Link
          href="/admin"
          onClick={() => onClose()}
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

      {/* Connected Services */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">연동 서비스</p>
        <GoogleCalendarConnect />
      </div>

      {/* Settings Links */}
      <div className="space-y-1">
        <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">설정</p>
        {settingsLinks.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
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

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-miss)] transition-colors hover:bg-[var(--color-danger-hover-bg)] disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {isSigningOut ? '로그아웃 중...' : '로그아웃'}
      </button>
    </ModalBody>
  )
}
