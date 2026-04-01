import { createContext, useContext, type ReactNode, type RefObject } from 'react'
import type { SelectedNodeType } from '@/stores/roadmap.store'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'

export interface CanvasInteractionsValue {
  handleNodeSelect: (type: SelectedNodeType, id: string) => void
  handleDeleteNode: (type: SelectedNodeType, id: string) => void
  handleStartAdd: (type: SelectedNodeType, id: string) => void
  handleCancelAdd: () => void
  getQuickAddContent: (node: VisualTreeNode) => ReactNode
  addingToId: string | null
  toggleGoalExpand: (goalId: string) => void
  toggleGroupExpand: (groupId: string) => void
  editingNodeId: string | null
  directionId: string | null
  pendingEditValueRef: RefObject<string | null>
  handleStartEdit: (type: SelectedNodeType, id: string) => void
  handleQuickCreate: (parentType: SelectedNodeType, parentId: string) => void
  handleRenameCommit: (
    nodeType: SelectedNodeType,
    nodeId: string,
    newName: string,
    extra?: Record<string, unknown>
  ) => void
  handleCancelEdit: () => void
}

export const CanvasInteractionsContext = createContext<CanvasInteractionsValue>(null!)

export function useCanvasInteractionsContext() {
  const ctx = useContext(CanvasInteractionsContext)
  if (!ctx) {
    throw new Error(
      'useCanvasInteractionsContext must be used within CanvasInteractionsContext.Provider'
    )
  }
  return ctx
}
