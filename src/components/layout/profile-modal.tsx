'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Shield,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Compass,
  Pencil,
  Check,
  X,
  Camera,
  MessageSquare,
  ExternalLink,
  LayoutDashboard,
} from 'lucide-react'
import { toast } from 'sonner'
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai/provider'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { useTheme } from '@/components/providers'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile, useUpdateAvatar } from '@/queries/use-profile'
import { useDirection, useUpdateDirection } from '@/queries/use-direction'
import { signOut } from '@/actions/auth.actions'
import { submitFeedback } from '@/actions/feedback.actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { GoogleCalendarConnect } from '@/features/profile/components/google-calendar-connect'

type ModalView = 'main' | 'notifications' | 'privacy' | 'feedback'

const themeOptions = [
  { value: 'light' as const, icon: Sun, label: '라이트' },
  { value: 'dark' as const, icon: Moon, label: '다크' },
  { value: 'system' as const, icon: Monitor, label: '시스템' },
]

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const [view, setView] = useState<ModalView>('main')

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setView('main')
    onOpenChange(nextOpen)
  }

  const viewTitles: Record<ModalView, string> = {
    main: '프로필',
    notifications: '알림 설정',
    privacy: '개인정보 보호',
    feedback: '의견 보내기',
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleClose} title={viewTitles[view]}>
      {view === 'main' ? (
        <MainView onNavigate={setView} onClose={() => handleClose(false)} />
      ) : (
        <SubViewWrapper onBack={() => setView('main')}>
          {view === 'notifications' && <NotificationSettingsView />}
          {view === 'privacy' && <PrivacySettingsView />}
          {view === 'feedback' && <FeedbackView />}
        </SubViewWrapper>
      )}
    </ResponsiveModal>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Avatar Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AvatarUpload({ avatarUrl, name }: { avatarUrl: string | null | undefined; name: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateAvatar = useUpdateAvatar()

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('avatar', file)
      await updateAvatar.mutateAsync(formData)

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [updateAvatar]
  )

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative mx-auto w-fit">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={updateAvatar.isPending}
        className="group relative h-20 w-20 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2"
        aria-label="프로필 사진 변경"
      >
        <div className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-[var(--color-border)]">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-primary-100)] text-xl font-bold text-[var(--color-primary-600)]">
              {initials || '👤'}
            </div>
          )}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/15">
          <Camera className="h-5 w-5 text-white opacity-0 drop-shadow-sm transition-opacity group-hover:opacity-100" />
        </div>
        {updateAvatar.isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>
      {/* Camera badge — outside overflow so it protrudes beyond the circle */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-primary)] shadow-sm ring-2 ring-[var(--color-bg-primary)] transition-colors hover:bg-[var(--color-primary-100)]"
        aria-label="사진 업로드"
      >
        <Camera className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary-600)]" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main View
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MainView({
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

      {/* AI Model */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">AI 모델</p>
        <div className="flex gap-1 rounded-xl bg-[var(--color-bg-secondary)] p-1">
          {AI_MODELS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => updateProfile.mutate({ ai_model: value })}
              className={cn(
                'flex flex-1 flex-col items-center justify-center rounded-lg py-2 text-sm font-medium transition-colors',
                profile?.ai_model === value || (!profile?.ai_model && value === DEFAULT_MODEL)
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-primary-500)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <span>{label}</span>
              <span className="text-[10px] font-normal text-[var(--color-text-tertiary)]">
                {description}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)]">채팅과 AI 제안 모두에 적용돼요</p>
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Direction Section (inline edit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(value.length, value.length)
    }
  }, [editing, value.length])

  const handleEdit = () => {
    setValue(direction?.statement ?? '')
    setEditing(true)
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

  // Skeleton while loading
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-View Wrapper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SubViewWrapper({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <ModalBody>
      <button
        onClick={onBack}
        className="mb-2 flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" />
        뒤로
      </button>
      {children}
    </ModalBody>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-Views
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NotificationSettingsView() {
  return (
    <div className="space-y-4">
      <ToggleRow label="달성 리마인더" description="매일 설정한 시간에 알림" defaultChecked />
      <ToggleRow label="주간 리뷰 알림" description="매주 일요일 저녁 리마인드" defaultChecked />
      <ToggleRow label="AI 인사이트" description="이누의 새 인사이트 알림" defaultChecked={false} />
    </div>
  )
}

function PrivacySettingsView() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm font-medium">데이터 내보내기</p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          모든 데이터를 JSON 형식으로 내보냅니다.
        </p>
        <button className="mt-3 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)]">
          내보내기
        </button>
      </div>
      <div className="rounded-xl border border-[var(--color-miss)]/20 bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm font-medium text-[var(--color-miss)]">계정 삭제</p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button className="mt-3 rounded-lg border border-[var(--color-miss)]/30 px-4 py-2 text-sm text-[var(--color-miss)] transition-colors hover:bg-[var(--color-danger-hover-bg)]">
          계정 삭제
        </button>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Feedback View
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FEEDBACK_CATEGORIES = [
  { value: 'general' as const, label: '일반' },
  { value: 'bug' as const, label: '버그 제보' },
  { value: 'feature' as const, label: '기능 요청' },
  { value: 'improvement' as const, label: '개선 사항' },
]

function FeedbackView() {
  const [category, setCategory] = useState<'general' | 'bug' | 'feature' | 'improvement'>('general')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await submitFeedback({ category, content: content.trim() })
      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.FEEDBACK_SUBMITTED, { category })
        setSubmitted(true)
        toast.success('소중한 의견 감사합니다!')
      } else {
        toast.error(result.error.message)
      }
    } catch {
      toast.error('제출에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="text-4xl">🙏</div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-[var(--color-text-primary)]">감사합니다!</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            보내주신 의견은 서비스 개선에 소중하게 활용됩니다.
          </p>
        </div>
        <KakaoTalkBanner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">카테고리</p>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                category === cat.value
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">내용</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="자유롭게 의견을 남겨주세요..."
          rows={4}
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-300)]"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        className="w-full rounded-xl bg-[var(--color-primary-500)] py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-50"
      >
        {isSubmitting ? '보내는 중...' : '의견 보내기'}
      </button>

      {/* KakaoTalk Banner */}
      <KakaoTalkBanner />
    </div>
  )
}

function KakaoTalkBanner() {
  return (
    <a
      href="https://open.kakao.com/o/pVa3PXFi"
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl bg-[#FEE500]/10 p-4 transition-colors hover:bg-[#FEE500]/20"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">💬</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            더 많은 이야기를 나누고 싶다면?
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            카카오톡 오픈채팅방에서 함께해요!
          </p>
        </div>
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      </div>
    </a>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Toggle Row
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ToggleRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string
  description: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-bg-tertiary)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}
