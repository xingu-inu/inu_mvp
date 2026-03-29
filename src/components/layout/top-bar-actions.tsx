'use client'

import { useState } from 'react'
import { ProfileModal } from './profile-modal'
import { NotificationPopover } from './notification-popover'
import { NavProfileButton } from './nav-profile-button'

export function TopBarActions() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <>
      <NotificationPopover />
      <NavProfileButton onClick={() => setIsProfileOpen(true)} />
      <ProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  )
}
