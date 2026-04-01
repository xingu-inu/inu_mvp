import { create } from 'zustand'
import type { ProposeStructureOutput } from '@/components/layout/ai-chat/proposal-utils'

interface BrainDumpPreviewState {
  /** propose_structure 원본 결과 */
  proposal: ProposeStructureOutput | null
  /** tempId → checked 상태 (ProposalCard와 동기화) */
  checkedItems: Record<string, boolean>
  /** 반영 중 펄스 애니메이션 */
  isPulsing: boolean

  setProposal: (proposal: ProposeStructureOutput | null) => void
  setCheckedItems: (items: Record<string, boolean>) => void
  setChecked: (tempId: string, checked: boolean) => void
  setPulsing: (pulsing: boolean) => void
  clearPreview: () => void
}

export const useBrainDumpPreviewStore = create<BrainDumpPreviewState>((set) => ({
  proposal: null,
  checkedItems: {},
  isPulsing: false,

  setProposal: (proposal) => set({ proposal }),
  setCheckedItems: (items) => set({ checkedItems: items }),
  setChecked: (tempId, checked) =>
    set((s) => ({ checkedItems: { ...s.checkedItems, [tempId]: checked } })),
  setPulsing: (isPulsing) => set({ isPulsing }),
  clearPreview: () => set({ proposal: null, checkedItems: {}, isPulsing: false }),
}))
