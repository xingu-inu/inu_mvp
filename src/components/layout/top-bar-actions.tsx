'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { HelpCircle } from 'lucide-react'
import { ProfileModal } from './profile-modal'
import { NotificationPopover } from './notification-popover'
import { NavProfileButton } from './nav-profile-button'

const GuideModal = dynamic(
  () => import('@/features/guide').then((m) => ({ default: m.GuideModal })),
  { ssr: false }
)

export function TopBarActions() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsGuideOpen(true)}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        aria-label="사용 가이드"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
      <GuideModal open={isGuideOpen} onOpenChange={setIsGuideOpen} />
      <NotificationPopover />
      <NavProfileButton onClick={() => setIsProfileOpen(true)} />
      <ProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  )
}
