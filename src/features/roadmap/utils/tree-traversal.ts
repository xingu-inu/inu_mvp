import type { VisualTreeNode } from '@/features/roadmap/components/visual-tree/tree-node-card'

/**
 * Find a node by its ID in the tree. Returns null if not found.
 */
export function findNode(tree: VisualTreeNode, nodeId: string): VisualTreeNode | null {
  if (tree.id === nodeId) return tree
  if (!tree.children) return null

  for (const child of tree.children) {
    const found = findNode(child, nodeId)
    if (found) return found
  }

  return null
}

/**
 * Find ancestor IDs from root to (but not including) targetId.
 * Returns [] if tree itself is the target, null if not found.
 */
export function findAncestors(node: VisualTreeNode, targetId: string): string[] | null {
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

/**
 * Collect all descendant IDs (not including the node itself).
 */
export function collectDescendants(node: VisualTreeNode): string[] {
  if (!node.children || node.children.length === 0) return []

  const ids: string[] = []
  for (const child of node.children) {
    ids.push(child.id)
    ids.push(...collectDescendants(child))
  }
  return ids
}

/**
 * Find the parent node of a given nodeId in the tree.
 */
export function findParent(tree: VisualTreeNode, nodeId: string): VisualTreeNode | null {
  if (!tree.children) return null

  for (const child of tree.children) {
    if (child.id === nodeId) return tree
    const found = findParent(child, nodeId)
    if (found) return found
  }

  return null
}
