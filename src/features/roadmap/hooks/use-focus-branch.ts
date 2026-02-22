import { useMemo } from 'react'
import type { VisualTreeNode } from '@/features/roadmap/components/visual-tree/tree-node-card'

function findAncestors(node: VisualTreeNode, targetId: string): string[] | null {
  if (node.id === targetId) return []

  if (!node.children) return null

  for (const child of node.children) {
    const result = findAncestors(child, targetId)
    if (result !== null) {
      return [node.id, ...result]
    }
  }

  return null
}

function findNode(node: VisualTreeNode, targetId: string): VisualTreeNode | null {
  if (node.id === targetId) return node

  if (!node.children) return null

  for (const child of node.children) {
    const result = findNode(child, targetId)
    if (result !== null) return result
  }

  return null
}

function collectDescendants(node: VisualTreeNode): string[] {
  if (!node.children || node.children.length === 0) return []

  const ids: string[] = []
  for (const child of node.children) {
    ids.push(child.id)
    ids.push(...collectDescendants(child))
  }
  return ids
}

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
