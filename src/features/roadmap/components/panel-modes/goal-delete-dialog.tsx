'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'

interface GoalDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onPause: () => void
}

export function GoalDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  onPause,
}: GoalDeleteDialogProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="이 목표를 삭제할까요?"
      description="연결된 그룹과 할 일도 함께 삭제됩니다."
    >
      <ModalBody>
        <p className="text-sm text-[var(--color-text-secondary)]">
          삭제 대신 &quot;일시정지&quot;로 기록을 보존할 수도 있어요.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" className="flex-1" onClick={onPause}>
          일시정지로 변경
        </Button>
        <Button
          variant="primary"
          className="flex-1 bg-[var(--color-miss)] hover:bg-[var(--color-miss)]"
          onClick={onConfirm}
        >
          삭제하기
        </Button>
      </ModalFooter>
    </ResponsiveModal>
  )
}
