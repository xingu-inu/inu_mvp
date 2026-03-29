'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@xyflow/react'
import { ChevronLeft, ChevronRight, X, Footprints } from 'lucide-react'
import { CanvasToolbar } from './canvas-toolbar'
import type { WhyMapNode, WhyMapEdge, WhyWalkStep, WhyWalkState } from './types'
import type { GoalNodeData, AreaNodeData, DirectionNodeData } from './types'

// ── Sequence builder (DFS) ──────────────────────────────────

export function buildWhyWalkSequence(nodes: WhyMapNode[], edges: WhyMapEdge[]): WhyWalkStep[] {
  // Build adjacency list from hierarchy edges
  const children = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.data?.edgeType !== 'hierarchy') continue
    const list = children.get(edge.source)
    if (list) list.push(edge.target)
    else children.set(edge.source, [edge.target])
  }

  const nodeMap = new Map<string, WhyMapNode>()
  for (const n of nodes) {
    if (n.type !== 'sticky') nodeMap.set(n.id, n)
  }

  // Find direction (root) node
  const directionNode = nodes.find((n) => n.type === 'direction')
  if (!directionNode) return []

  // DFS traversal
  const sequence: WhyWalkStep[] = []
  const stack = [directionNode.id]

  while (stack.length > 0) {
    const id = stack.pop()!
    const node = nodeMap.get(id)
    if (!node) continue

    const step = nodeToStep(node)
    if (step) sequence.push(step)

    // Push children in reverse so first child is visited first
    const childIds = children.get(id) ?? []
    for (let i = childIds.length - 1; i >= 0; i--) {
      stack.push(childIds[i])
    }
  }

  return sequence
}

function nodeToStep(node: WhyMapNode): WhyWalkStep | null {
  if (node.type === 'direction') {
    const data = node.data as DirectionNodeData
    return {
      nodeId: node.id,
      type: 'direction',
      name: data.treeNode.name,
      emoji: data.treeNode.emoji,
      why: data.treeNode.why,
    }
  }
  if (node.type === 'area') {
    const data = node.data as AreaNodeData
    return {
      nodeId: node.id,
      type: 'area',
      name: data.treeNode.name,
      emoji: data.treeNode.emoji,
      why: data.treeNode.why,
    }
  }
  if (node.type === 'goal') {
    const data = node.data as GoalNodeData
    const meta = data.treeNode.meta
    return {
      nodeId: node.id,
      type: 'goal',
      name: data.treeNode.name,
      emoji: data.treeNode.emoji,
      why: data.treeNode.why,
      stats: meta
        ? {
            totalStreak: meta.totalStreak,
            completionRate: meta.totalCount
              ? Math.round(((meta.doneCount ?? 0) / meta.totalCount) * 100)
              : undefined,
            activeCount: meta.count,
          }
        : undefined,
    }
  }
  return null
}

// ── Type label ──────────────────────────────────────────────

const TYPE_LABELS: Record<WhyWalkStep['type'], string> = {
  direction: 'Direction',
  area: 'Area',
  goal: 'Goal',
}

// ── Overlay component ───────────────────────────────────────

interface WhyWalkOverlayProps {
  state: WhyWalkState
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

export const WhyWalkOverlay = memo(function WhyWalkOverlay({
  state,
  onPrev,
  onNext,
  onClose,
}: WhyWalkOverlayProps) {
  const step = useMemo(
    () => state.sequence[state.currentIndex],
    [state.sequence, state.currentIndex]
  )

  if (!step) return null

  const isFirst = state.currentIndex === 0
  const isLast = state.currentIndex === state.sequence.length - 1

  return (
    <Panel position="bottom-center" className="!mb-2">
      <div className="glass-3 flex max-w-md flex-col items-center gap-2 rounded-xl px-5 py-3 shadow-lg">
        {/* Header: step counter + close */}
        <div className="flex w-full items-center justify-between text-[10px] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-1.5">
            <Footprints className="h-3 w-3" />
            <span>Why Walk</span>
          </div>
          <div className="flex items-center gap-2">
            <span>
              {state.currentIndex + 1} / {state.sequence.length}
            </span>
            <button
              onClick={onClose}
              aria-label="Close Why Walk"
              className="rounded p-0.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Type badge + name */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {TYPE_LABELS[step.type]}
          </span>
          <span className="text-sm font-semibold">
            {step.emoji && <span className="mr-1">{step.emoji}</span>}
            {step.name}
          </span>
        </div>

        {/* Why text */}
        {step.why && (
          <p className="text-center text-xs text-[var(--color-text-secondary)] italic">
            &ldquo;{step.why}&rdquo;
          </p>
        )}

        {/* Goal stats */}
        {step.type === 'goal' && step.stats && (
          <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-tertiary)]">
            {step.stats.totalStreak != null && step.stats.totalStreak > 0 && (
              <span>streak {step.stats.totalStreak}d</span>
            )}
            {step.stats.completionRate != null && <span>{step.stats.completionRate}% done</span>}
            {step.stats.activeCount != null && step.stats.activeCount > 0 && (
              <span>{step.stats.activeCount} tasks</span>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <CanvasToolbar.Button
            onClick={onPrev}
            disabled={isFirst}
            aria-label="Previous step"
            icon={<ChevronLeft className="h-4 w-4" />}
          />

          {/* Progress: dots for small sequences, text for large */}
          {state.sequence.length <= 15 ? (
            <div className="flex items-center gap-1">
              {state.sequence.map((s, i) => (
                <div
                  key={s.nodeId}
                  className={`h-1.5 rounded-full transition-all ${
                    i === state.currentIndex
                      ? 'w-4 bg-[var(--color-text-primary)]'
                      : 'w-1.5 bg-[var(--color-border)]'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="min-w-[3rem] text-center text-xs text-[var(--color-text-secondary)] tabular-nums">
              {state.currentIndex + 1} / {state.sequence.length}
            </span>
          )}

          <CanvasToolbar.Button
            onClick={onNext}
            disabled={isLast}
            aria-label="Next step"
            icon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
      </div>
    </Panel>
  )
})
