'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Target, CalendarDays } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import type { SelectedNodeType } from '@/stores/roadmap.store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useUpdateGoal } from '@/queries/use-goals'
import { ZOOM_COMPACT, ZOOM_FULL, type GoalNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { WhyChainTooltip } from './why-chain-tooltip'
import { AddChildButton } from './add-child-button'
import { InlineEditInput } from './inline-edit-input'

// ── Inline date trigger (local) ────────────────────────────

function InlineDateTrigger({
  value,
  onChange,
  placeholder,
  onOpenChange,
}: {
  value?: string | null
  onChange: (date: string | null) => void
  placeholder: string
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const dateObj = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const valid = dateObj ? isValid(dateObj) : false

  const toggle = (o: boolean) => {
    setOpen(o)
    onOpenChange?.(o)
  }

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded px-1 py-0.5 text-[10px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {valid && dateObj ? format(dateObj, 'M/d') : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={valid && dateObj ? dateObj : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : null)
            toggle(false)
          }}
          defaultMonth={valid && dateObj ? dateObj : undefined}
        />
        {valid && (
          <div className="border-t border-[var(--color-border)] px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                toggle(false)
              }}
              className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              날짜 해제
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Main component ─────────────────────────────────────────

export const GoalNode = memo(function GoalNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<GoalNodeData, 'goal'>>) {
  const {
    treeNode,
    ancestorWhys,
    isSelected,
    isSearchMatch,
    searchQuery,
    zoomLevel = ZOOM_FULL,
    isExpanded,
  } = data
  const hasChildren = !!treeNode.children?.length
  const isDraft = treeNode.status === 'backlog'
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const isFull = zoomLevel >= ZOOM_FULL
  const isGhost = data.isGhost === true
  const isGhostPulsing = data.isGhostPulsing === true
  const isDropTarget = data.isDropTarget === true
  const isInvalidHover = data.isInvalidHover === true

  const {
    handleNodeSelect,
    handleDeleteNode,
    handleStartEdit,
    handleStartAdd,
    addingToId,
    getQuickAddContent,
    toggleGoalExpand,
    editingNodeId,
    pendingEditValueRef,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
  } = useCanvasInteractionsContext()
  const isEditing = editingNodeId === id

  const handleToggle = useCallback(() => {
    toggleGoalExpand(id)
  }, [id, toggleGoalExpand])

  const handleSelect = useCallback(() => {
    handleNodeSelect('goal', id)
  }, [handleNodeSelect, id])

  const handleEdit = useCallback(() => {
    handleStartEdit('goal', id)
  }, [handleStartEdit, id])

  const onAddChild = useCallback(() => handleStartAdd('goal', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('goal', id), [handleDeleteNode, id])

  // ── Multi-field edit state ──
  const editContainerRef = useRef<HTMLDivElement>(null)
  const whyInputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)
  const openPopoversRef = useRef(0)
  const updateGoalMutation = useUpdateGoal()

  // Reset committed guard when entering edit mode
  useEffect(() => {
    if (isEditing) committedRef.current = false
  }, [isEditing])

  const handleGoalCommit = useCallback(
    (nodeType: SelectedNodeType, nodeId: string, newName: string) => {
      if (committedRef.current) return
      committedRef.current = true
      const extra: Record<string, unknown> = {}
      const whyValue = whyInputRef.current?.value
      if (whyValue !== undefined && whyValue !== (treeNode.why ?? '')) {
        extra.why = whyValue || null
      }
      handleRenameCommit(
        nodeType,
        nodeId,
        newName,
        Object.keys(extra).length > 0 ? extra : undefined
      )
    },
    [handleRenameCommit, treeNode.why]
  )

  const handleDateChange = useCallback(
    (field: 'start_date' | 'target_date', value: string | null) => {
      updateGoalMutation.mutate({ id, input: { [field]: value } })
    },
    [id, updateGoalMutation]
  )

  const handleDatePickerToggle = useCallback((open: boolean) => {
    openPopoversRef.current += open ? 1 : -1
  }, [])

  const handleContainerBlur = useCallback(() => {
    setTimeout(() => {
      if (committedRef.current) return
      if (!editContainerRef.current) return
      if (editContainerRef.current.contains(document.activeElement)) return
      // Check for open Radix popovers (rendered in portal)
      if (openPopoversRef.current > 0) return
      // Focus left entirely — commit
      const currentName = pendingEditValueRef.current ?? treeNode.name
      handleGoalCommit('goal', id, currentName)
    }, 0)
  }, [handleGoalCommit, id, treeNode.name, pendingEditValueRef])

  const handleWhyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelEdit()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const currentName = pendingEditValueRef.current ?? treeNode.name
        handleGoalCommit('goal', id, currentName)
      }
    },
    [handleCancelEdit, handleGoalCommit, id, treeNode.name, pendingEditValueRef]
  )

  return (
    <div
      className={cn(
        'group/add group/why relative max-w-[250px] min-w-[180px]',
        isDraft && 'rounded-xl border-2 border-dashed border-[var(--color-border)]',
        isDraft && '[&_[data-node-card]]:border-transparent',
        isDropTarget && 'ring-dashed rounded-lg ring-2 ring-[var(--color-primary-400)]/60',
        // Suppress invalid-hover ring on draft goals — their dashed border
        // already outlines the wrapper and stacking both is visually noisy.
        !isDraft &&
          isInvalidHover &&
          !isDropTarget &&
          'rounded-lg ring-2 ring-red-400/70 ring-offset-1'
      )}
    >
      {isFull && ancestorWhys && ancestorWhys.length > 0 && (
        <WhyChainTooltip
          ancestorWhys={ancestorWhys}
          currentName={treeNode.name}
          currentWhy={treeNode.why}
        />
      )}
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isCompact ? (
        /* Compact zoom: name-only simplified box */
        <div
          className={cn(
            'cursor-grab rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm transition-all hover:border-[var(--color-border-secondary)] hover:shadow-md',
            isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]',
            isGhost && [
              'border-dashed',
              'border-amber-300 dark:border-amber-600',
              'bg-amber-50/50 dark:bg-amber-900/20',
            ],
            isGhostPulsing && 'animate-pulse'
          )}
          onClick={handleSelect}
        >
          <span className="block truncate text-xs font-medium text-[var(--color-text-primary)]">
            {treeNode.name}
          </span>
        </div>
      ) : (
        <>
          {isEditing && !isGhost ? (
            <div
              ref={editContainerRef}
              className="relative overflow-hidden rounded-lg border border-[var(--color-primary-400)] bg-[var(--color-bg-primary)] shadow-sm"
              onBlur={handleContainerBlur}
            >
              {treeNode.areaColor && (
                <div
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: treeNode.areaColor }}
                />
              )}
              <div className="py-2 pr-3 pl-4">
                {/* Name row: icon + input */}
                <div className="flex items-center gap-2">
                  {treeNode.vibe?.emoji ? (
                    <span className="flex-shrink-0 text-base leading-none">
                      {treeNode.vibe.emoji}
                    </span>
                  ) : (
                    <Target className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <InlineEditInput
                      nodeType="goal"
                      nodeId={id}
                      defaultValue={treeNode.name}
                      className="text-sm font-medium text-[var(--color-text-primary)]"
                      onCommit={handleGoalCommit}
                      onCancel={handleCancelEdit}
                      pendingValueRef={pendingEditValueRef}
                      editContainerRef={editContainerRef}
                      onChainTab={() => handleQuickCreate('goal', id)}
                    />
                  </div>
                </div>
                {/* Why row */}
                <div className="mt-1 pl-6">
                  <input
                    ref={whyInputRef}
                    defaultValue={treeNode.why ?? ''}
                    placeholder="왜 이 목표를?"
                    className="w-full bg-transparent text-[10px] text-[var(--color-text-tertiary)] italic outline-none placeholder:opacity-50"
                    onKeyDown={handleWhyKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {/* Date row */}
                <div className="mt-1 flex items-center gap-1 pl-6">
                  <CalendarDays className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                  <InlineDateTrigger
                    value={treeNode.meta?.startDate}
                    onChange={(date) => handleDateChange('start_date', date)}
                    placeholder="시작일"
                    onOpenChange={handleDatePickerToggle}
                  />
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">~</span>
                  <InlineDateTrigger
                    value={treeNode.meta?.endDate}
                    onChange={(date) => handleDateChange('target_date', date)}
                    placeholder="목표일"
                    onOpenChange={handleDatePickerToggle}
                  />
                </div>
              </div>
            </div>
          ) : isGhost ? (
            <div
              className={cn(
                'cursor-default overflow-hidden rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 shadow-sm transition-all dark:border-amber-600 dark:bg-amber-900/20',
                isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
                isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]',
                isGhostPulsing && 'animate-pulse'
              )}
              onClick={handleSelect}
            >
              <div className="flex items-center gap-2">
                <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
                  {treeNode.name}
                </span>
                <span className="ml-auto flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                  NEW
                </span>
              </div>
              {treeNode.why && (
                <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-tertiary)] italic">
                  {treeNode.why}
                </span>
              )}
            </div>
          ) : (
            <TreeContextMenu
              node={treeNode}
              onEdit={handleEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            >
              <div>
                <TreeNodeCard
                  node={treeNode}
                  isSelected={isSelected ?? false}
                  isExpanded={isExpanded ?? false}
                  hasChildren={hasChildren}
                  onSelect={handleSelect}
                  onToggle={handleToggle}
                  isSearchMatch={isSearchMatch}
                  searchQuery={searchQuery}
                />
              </div>
            </TreeContextMenu>
          )}

          {/* Status tag (non-active only) */}
          {(() => {
            if (!treeNode.status || treeNode.status === 'active') return null
            const statusConfig = GOAL_STATUS_CONFIG[treeNode.status as GoalStatus]
            if (!statusConfig) return null
            return (
              <div className="px-3 pb-1">
                <span
                  className={cn(
                    'inline-block rounded-full px-1.5 py-px text-[9px] font-medium',
                    statusConfig.bg,
                    statusConfig.text
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
            )
          })()}

          {/* Quick-add popover */}
          {!isGhost && addingToId === id && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
              {getQuickAddContent(treeNode)}
            </div>
          )}

          {!isGhost && addingToId !== id && !isCompact && (
            <AddChildButton
              onClick={() => handleQuickCreate('goal', id)}
              label="할일 추가"
              sourcePosition={sourcePosition}
            />
          )}
        </>
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
