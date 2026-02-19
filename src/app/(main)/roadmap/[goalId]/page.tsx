'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { PageContainer } from '@/components/layout'
import { useRoadmapStore, selectPanelMode } from '@/stores/roadmap.store'
import { GoalViewMode, GroupEditForm, GroupCreateForm } from '@/features/roadmap'

interface GoalDetailPageProps {
  params: Promise<{ goalId: string }>
}

export default function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { goalId } = use(params)
  const router = useRouter()
  const select = useRoadmapStore((s) => s.select)
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const panelMode = useRoadmapStore(selectPanelMode)

  // Set the selected goal ID when the page loads
  useEffect(() => {
    select({ type: 'goal', id: goalId })
    return () => {
      clearSelection()
    }
  }, [goalId, select, clearSelection])

  const handleBack = () => {
    router.push('/roadmap')
  }

  // Render based on panel mode
  const renderContent = () => {
    switch (panelMode) {
      case 'edit-group':
        return <GroupEditForm />
      case 'create-group':
        return <GroupCreateForm />
      case 'view':
      default:
        return (
          <GoalViewMode
            goalId={goalId}
            onBack={handleBack}
            showBackButton
            showCloseButton={false}
          />
        )
    }
  }

  return (
    <PageContainer className="p-0">
      <div className="h-full">{renderContent()}</div>
    </PageContainer>
  )
}
