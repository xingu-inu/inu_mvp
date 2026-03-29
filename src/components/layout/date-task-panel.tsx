'use client'

import dynamic from 'next/dynamic'

import { useRoadmapStore, selectPanelMode, selectRightPanelTab } from '@/stores/roadmap.store'
import { GoalBrowsePanel } from '@/features/roadmap/components/panel-modes'
import { GroupEditForm, GroupCreateForm } from '@/features/roadmap'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'

const EmbeddedAiChat = dynamic(
  () => import('./ai-chat/ai-chat-panel').then((m) => ({ default: m.AiChatPanel })),
  { ssr: false }
)

const PANEL_TAB_OPTIONS = [
  { value: 'roadmap', label: '로드맵' },
  { value: 'ai-chat', label: 'AI 채팅' },
]

/** Roadmap right panel — routes by panelMode */
function RoadmapPanel() {
  const panelMode = useRoadmapStore(selectPanelMode)

  switch (panelMode) {
    case 'edit-group':
      return <GroupEditForm />
    case 'create-group':
      return <GroupCreateForm />
    default:
      return <GoalBrowsePanel />
  }
}

function RoadmapPanelWithToggle() {
  const rightPanelTab = useRoadmapStore(selectRightPanelTab)
  const setRightPanelTab = useRoadmapStore((s) => s.setRightPanelTab)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-[var(--color-border)] px-4 py-2">
        <FormSegmentedControl
          value={rightPanelTab}
          onChange={(v) => setRightPanelTab(v as 'roadmap' | 'ai-chat')}
          options={PANEL_TAB_OPTIONS}
          compact
          layoutId="right-panel-tab"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {rightPanelTab === 'ai-chat' ? <EmbeddedAiChat embedded /> : <RoadmapPanel />}
      </div>
    </div>
  )
}

/** Main exported component - unified panel */
export function DateTaskPanel() {
  return <RoadmapPanelWithToggle />
}
