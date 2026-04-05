'use client'

import { useEffect } from 'react'
import type { SelectedNodeType } from '@/stores/roadmap.store'
import type { WhyMapNode, WhyMapEdge } from './types'

interface UseCanvasKeyboardOptions {
  nodes: WhyMapNode[]
  edges: WhyMapEdge[]
  selectedNodeId: string | null
  direction: 'TB' | 'LR'
  handleQuickCreate: (type: SelectedNodeType, id: string) => void
  handleNodeSelect: (type: SelectedNodeType, id: string) => void
  handleStartEdit: (type: SelectedNodeType, id: string) => void
  clearSelection: () => void
  handleDeleteNode: (type: SelectedNodeType, id: string) => void
  toggleNodeExpand: (nodeId: string) => void
  expandNode: (nodeId: string) => void
  collapseNode: (nodeId: string) => void
  cancelDrag?: () => void
  onToggleFloatingPanel?: () => void
  onFitView?: () => void
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
  handleQuickCreate,
  handleNodeSelect,
  handleStartEdit,
  clearSelection,
  handleDeleteNode,
  toggleNodeExpand,
  expandNode,
  collapseNode,
  cancelDrag,
  onToggleFloatingPanel,
  onFitView,
}: UseCanvasKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      // Escape: cancel drag (if active) + clear selection
      if (e.key === 'Escape') {
        cancelDrag?.()
        clearSelection()
        return
      }

      // ] → toggle floating panel
      if (e.key === ']') {
        onToggleFloatingPanel?.()
        return
      }

      if (!selectedNodeId) return

      const current = nodes.find((n) => n.id === selectedNodeId)
      if (!current) return

      // Delete / Backspace: delete selected node (not direction)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (current.type !== 'direction') {
          e.preventDefault()
          handleDeleteNode(current.type as SelectedNodeType, current.id)
        }
        return
      }

      // F2: trigger inline edit
      if (e.key === 'F2') {
        e.preventDefault()
        handleStartEdit(current.type as SelectedNodeType, current.id)
        return
      }

      // Space: toggle expand/collapse
      if (e.key === ' ') {
        e.preventDefault()
        toggleNodeExpand(current.id)
        return
      }

      // - key: collapse children
      if (e.key === '-') {
        e.preventDefault()
        collapseNode(current.id)
        return
      }

      // + or = key: expand children
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        expandNode(current.id)
        return
      }

      // Home: jump to root (direction) node
      if (e.key === 'Home') {
        e.preventDefault()
        const directionNode = nodes.find((n) => n.type === 'direction')
        if (directionNode) {
          handleNodeSelect('direction', directionNode.id)
          onFitView?.()
        }
        return
      }

      switch (e.key) {
        case 'Tab': {
          e.preventDefault()
          // Add child: instantly create and enter inline edit
          if (
            current.type === 'direction' ||
            current.type === 'area' ||
            current.type === 'goal' ||
            current.type === 'group'
          ) {
            handleQuickCreate(current.type as SelectedNodeType, current.id)
          }
          break
        }

        case 'Enter': {
          e.preventDefault()
          // Add sibling: find parent via edges, then quick-create on parent
          const parentEdge = edges.find(
            (edge) => edge.target === selectedNodeId && edge.data?.edgeType === 'hierarchy'
          )
          if (!parentEdge) break // direction node has no parent

          const parentNode = nodes.find((n) => n.id === parentEdge.source)
          if (parentNode) {
            handleQuickCreate(parentNode.type as SelectedNodeType, parentNode.id)
          }
          break
        }

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault()
          const nearest = findNearestNode(current, nodes, e.key, direction)
          if (nearest) {
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
    handleQuickCreate,
    handleNodeSelect,
    handleStartEdit,
    clearSelection,
    handleDeleteNode,
    toggleNodeExpand,
    expandNode,
    collapseNode,
    cancelDrag,
    onToggleFloatingPanel,
    onFitView,
  ])
}

// ── Nearest node finder ─────────────────────────────────────

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/** Minimum pixel offset to consider a node as a candidate in the given direction */
const DIRECTION_THRESHOLD_PX = 5

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
    if (n.id === current.id) return false

    const dx = n.position.x - cx
    const dy = n.position.y - cy

    switch (key) {
      case 'ArrowUp':
        return dy < -DIRECTION_THRESHOLD_PX
      case 'ArrowDown':
        return dy > DIRECTION_THRESHOLD_PX
      case 'ArrowLeft':
        return dx < -DIRECTION_THRESHOLD_PX
      case 'ArrowRight':
        return dx > DIRECTION_THRESHOLD_PX
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
