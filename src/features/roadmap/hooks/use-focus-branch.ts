import { useMemo } from 'react'
import { findNode, findAncestors, collectDescendants } from '../utils/tree-traversal'
import type { VisualTreeNode } from '@/features/roadmap/components/visual-tree/tree-node-card'

export function useFocusBranch(
  tree: VisualTreeNode | null,
  selectedNodeId: string | null
): Set<string> | null {
  return useMemo(() => {
    if (!selectedNodeId || !tree) return null

    const ancestors = findAncestors(tree, selectedNodeId)
    if (ancestors === null) return null

    const selectedNode = findNode(tree, selectedNodeId)
    const descendants = selectedNode ? collectDescendants(selectedNode) : []
    return new Set([...ancestors, selectedNodeId, ...descendants])
  }, [tree, selectedNodeId])
}
