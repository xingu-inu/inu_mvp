'use client'

import { ProfilePanel } from './profile-panel'
import { TimelinePanel } from './timeline-panel'

export function RecordPageClient() {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <ProfilePanel />
      <div className="min-h-0 flex-1 overflow-y-auto lg:h-full">
        <TimelinePanel />
      </div>
    </div>
  )
}
