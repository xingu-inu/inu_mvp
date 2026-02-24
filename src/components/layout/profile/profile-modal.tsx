'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { ProfileMainView } from './profile-main-view'
import { NotificationSettingsView } from './notification-settings'
import { PrivacySettingsView } from './privacy-settings'
import { FeedbackView } from './feedback-view'

export type ModalView = 'main' | 'notifications' | 'privacy' | 'feedback'

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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
        <ProfileMainView onNavigate={setView} onClose={() => handleClose(false)} />
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
