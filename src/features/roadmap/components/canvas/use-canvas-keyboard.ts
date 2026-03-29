'use client'

import { useEffect } from 'react'
import type { SelectedNodeType } from '@/stores/roadmap.store'
import type { WhyMapNode, WhyMapEdge } from './types'

interface UseCanvasKeyboardOptions {
  nodes: WhyMapNode[]
  edges: WhyMapEdge[]
  selectedNodeId: string | null
  direction: 'TB' | 'LR'
  /** Note: the type param is currently unused by the underlying implementation (setAddingToId ignores it),
   *  but we pass it for forward-compatibility if handleStartAdd is ever refactored to use it. */
  handleStartAdd: (type: SelectedNodeType, id: string) => void
  handleNodeSelect: (type: SelectedNodeType, id: string) => void
  clearSelection: () => void
  // Why Walk callbacks
  isWhyWalkActive?: boolean
  onToggleWhyWalk?: () => void
  onWhyWalkPrev?: () => void
  onWhyWalkNext?: () => void
  // Brainstorm mode callbacks
  isBrainstormMode?: boolean
  onToggleBrainstorm?: () => void
  // Floating panel toggle
  onToggleFloatingPanel?: () => void
}

/**
 * Keyboard shortcuts for mindmap-style canvas navigation.
 *
 * - Tab   → add child to selected node
 * - Enter → add sibling (add child to parent)
 * - Arrow → move selection to nearest node in that direction
 */
export function useCanvasKeyboard({
  nodes,
  edges,
  selectedNodeId,
  direction,
  handleStartAdd,
  handleNodeSelect,
  clearSelection,
  isWhyWalkActive,
  onToggleWhyWalk,
  onWhyWalkPrev,
  onWhyWalkNext,
  isBrainstormMode,
  onToggleBrainstorm,
  onToggleFloatingPanel,
}: UseCanvasKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      // Escape: exit Why Walk or Brainstorm first, then clear selection
      if (e.key === 'Escape') {
        if (isWhyWalkActive) {
          onToggleWhyWalk?.()
          return
        }
        if (isBrainstormMode) {
          onToggleBrainstorm?.()
          return
        }
        clearSelection()
        return
      }

      // Why Walk navigation (when active, capture arrow keys)
      if (isWhyWalkActive) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onWhyWalkPrev?.()
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          onWhyWalkNext?.()
          return
        }
        // W also exits Why Walk
        if (e.key === 'w' || e.key === 'W') {
          onToggleWhyWalk?.()
          return
        }
        // Block other keys during Why Walk
        return
      }

      // W → toggle Why Walk
      if (e.key === 'w' || e.key === 'W') {
        onToggleWhyWalk?.()
        return
      }

      // B → toggle Brainstorm mode
      if (e.key === 'b' || e.key === 'B') {
        onToggleBrainstorm?.()
        return
      }

      // ] → toggle floating panel
      if (e.key === ']') {
        onToggleFloatingPanel?.()
        return
      }

      if (!selectedNodeId) return

      const current = nodes.find((n) => n.id === selectedNodeId)
      if (!current || current.type === 'sticky') return

      switch (e.key) {
        case 'Tab': {
          e.preventDefault()
          // Add child: only direction and area can have canvas-level children
          if (current.type === 'direction' || current.type === 'area' || current.type === 'goal') {
            handleStartAdd(current.type as SelectedNodeType, current.id)
          }
          break
        }

        case 'Enter': {
          e.preventDefault()
          // Add sibling: find parent via edges, then handleStartAdd on parent
          const parentEdge = edges.find(
            (edge) => edge.target === selectedNodeId && edge.data?.edgeType === 'hierarchy'
          )
          if (!parentEdge) break // direction node has no parent

          const parentNode = nodes.find((n) => n.id === parentEdge.source)
          if (parentNode && parentNode.type !== 'sticky') {
            handleStartAdd(parentNode.type as SelectedNodeType, parentNode.id)
          }
          break
        }

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault()
          const nearest = findNearestNode(current, nodes, e.key, direction)
          if (nearest && nearest.type !== 'sticky') {
            handleNodeSelect(nearest.type as SelectedNodeType, nearest.id)
          }
          break
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    nodes,
    edges,
    selectedNodeId,
    direction,
    handleStartAdd,
    handleNodeSelect,
    clearSelection,
    isWhyWalkActive,
    onToggleWhyWalk,
    onWhyWalkPrev,
    onWhyWalkNext,
    isBrainstormMode,
    onToggleBrainstorm,
    onToggleFloatingPanel,
  ])
}

// ── Nearest node finder ─────────────────────────────────────

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

function findNearestNode(
  current: WhyMapNode,
  nodes: WhyMapNode[],
  key: ArrowKey,
  layoutDirection: 'TB' | 'LR'
): WhyMapNode | null {
  const cx = current.position.x
  const cy = current.position.y

  // Filter candidates by physical direction on screen:
  // TB: Up/Down = hierarchy (y-axis), Left/Right = siblings (x-axis)
  // LR: Left/Right = hierarchy (x-axis), Up/Down = siblings (y-axis)
  const candidates = nodes.filter((n) => {
    if (n.id === current.id || n.type === 'sticky') return false

    const dx = n.position.x - cx
    const dy = n.position.y - cy

    switch (key) {
      case 'ArrowUp':
        return dy < -10
      case 'ArrowDown':
        return dy > 10
      case 'ArrowLeft':
        return dx < -10
      case 'ArrowRight':
        return dx > 10
      default:
        return false
    }
  })

  if (candidates.length === 0) return null

  // Pick closest by euclidean distance, with bias toward the primary axis direction
  let best: WhyMapNode | null = null
  let bestDist = Infinity

  for (const n of candidates) {
    const dx = n.position.x - cx
    const dy = n.position.y - cy

    // Weight the primary axis less so we prefer nodes "in front" of current direction
    let dist: number
    if (layoutDirection === 'TB') {
      const isVerticalKey = key === 'ArrowUp' || key === 'ArrowDown'
      dist = isVerticalKey
        ? Math.abs(dy) + Math.abs(dx) * 2 // prefer vertical alignment
        : Math.abs(dx) + Math.abs(dy) * 2 // prefer horizontal alignment
    } else {
      const isHorizontalKey = key === 'ArrowLeft' || key === 'ArrowRight'
      dist = isHorizontalKey ? Math.abs(dx) + Math.abs(dy) * 2 : Math.abs(dy) + Math.abs(dx) * 2
    }

    if (dist < bestDist) {
      bestDist = dist
      best = n
    }
  }

  return best
}
