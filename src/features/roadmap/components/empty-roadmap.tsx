'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/common/mascot'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { InlineAreaCreate } from './inline-forms/inline-area-create'
import { useAreas } from '@/queries/use-areas'
import type { AreaType } from '@/types/entities'

interface EmptyRoadmapProps {
  onAddGoal?: () => void
  isMobile?: boolean
}

export function EmptyRoadmap({ onAddGoal, isMobile = false }: EmptyRoadmapProps) {
  const [isAreaDrawerOpen, setIsAreaDrawerOpen] = useState(false)
  const { data: areas = [] } = useAreas()
  const existingAreaTypes = areas.filter((a) => a.is_active).map((a) => a.type) as AreaType[]

  const handleClick = () => {
    if (isMobile) {
      setIsAreaDrawerOpen(true)
    } else {
      onAddGoal?.()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Icon */}
      <div className="mb-6">
        <Mascot mood="encouraging" size="lg" />
      </div>

      {/* Text */}
      <h3 className="mb-2 text-lg font-semibold">아직 목표가 없어요</h3>
      <p className="mb-6 max-w-xs text-[var(--color-text-secondary)]">
        인생의 첫 영역을 추가하고
        <br />
        로드맵을 시작해보세요
      </p>

      {/* CTA */}
      <Button onClick={handleClick} className="gap-2">
        <Plus className="h-4 w-4" />
        시작하기
      </Button>

      {/* Mobile: Area creation drawer */}
      {isMobile && (
        <ResponsiveModal
          open={isAreaDrawerOpen}
          onOpenChange={setIsAreaDrawerOpen}
          title="영역 추가"
          description="인생에서 중요한 영역을 추가하세요"
          forceMode="drawer"
        >
          <InlineAreaCreate
            existingAreaTypes={existingAreaTypes}
            onDone={() => setIsAreaDrawerOpen(false)}
          />
        </ResponsiveModal>
      )}
    </div>
  )
}
