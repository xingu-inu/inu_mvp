'use client'

import { useState, memo, useCallback, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'
import { TreeNodeCard, type VisualTreeNode } from './tree-node-card'
import { TreeContextMenu } from './tree-context-menu'
import type { SelectedNodeType, TreeLayoutDirection } from '@/stores/roadmap.store'

interface TreeNodeProps {
  node: VisualTreeNode
  selectedNodeId: string | null
  onNodeSelect: (type: SelectedNodeType, id: string) => void
  isFormMode: boolean
  defaultExpanded?: boolean
  layoutDirection: TreeLayoutDirection
  addingToId?: string | null
  onStartAdd?: (type: SelectedNodeType, id: string) => void
  onCancelAdd?: () => void
  getQuickAddContent?: (node: VisualTreeNode) => ReactNode
  focusedIds: Set<string> | null
  searchMatchedIds: Set<string>
  searchQuery: string
  onDeleteNode: (type: SelectedNodeType, id: string) => void
  parentGoalMap: Map<string, string>
}

export const TreeNode = memo(function TreeNode({
  node,
  selectedNodeId,
  onNodeSelect,
  isFormMode,
  defaultExpanded,
  layoutDirection,
  addingToId,
  onStartAdd,
  onCancelAdd,
  getQuickAddContent,
  focusedIds,
  searchMatchedIds,
  searchQuery,
  onDeleteNode,
  parentGoalMap,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? getDefaultExpanded(node))

  const hasChildren = !!node.children && node.children.length > 0
  const isSelected = selectedNodeId === node.id
  const isHorizontal = layoutDirection === 'horizontal'
  const canAdd = node.type !== 'task'
  const isAddingHere = addingToId === node.id

  // Focus mode: dim non-focused nodes
  const isFocusDimmed = focusedIds !== null && !focusedIds.has(node.id)

  // Search: check if this node is a direct name match (for text highlight)
  const isSearchActive = searchMatchedIds.size > 0
  const isInSearchPath = isSearchActive && searchMatchedIds.has(node.id)
  const isSearchMatch =
    isSearchActive &&
    searchQuery.length > 0 &&
    node.name.toLowerCase().includes(searchQuery.toLowerCase())

  // Auto-expand when search finds matches in subtree
  const effectiveExpanded = isSearchActive && isInSearchPath ? true : isExpanded

  // Stable callbacks for child components (enables memo on children)
  const handleSelect = useCallback(
    () => onNodeSelect(node.type, node.id),
    [onNodeSelect, node.type, node.id]
  )

  const handleToggle = useCallback(() => setIsExpanded((prev) => !prev), [])

  const handleStartAdd = useCallback(
    () => onStartAdd?.(node.type, node.id),
    [onStartAdd, node.type, node.id]
  )

  const handleDelete = useCallback(
    () => onDeleteNode(node.type, node.id),
    [onDeleteNode, node.type, node.id]
  )

  const cardElement = (
    <TreeNodeCard
      node={node}
      isSelected={isSelected}
      isExpanded={effectiveExpanded}
      hasChildren={hasChildren}
      onSelect={handleSelect}
      onToggle={handleToggle}
      isSearchMatch={isSearchMatch}
      searchQuery={searchQuery}
    />
  )

  return (
    <div className={isHorizontal ? 'flex flex-row items-center' : 'flex flex-col items-center'}>
      {/* Card with context menu, optional [+] button and popover */}
      <Popover.Root
        open={isAddingHere}
        onOpenChange={(open) => {
          if (!open) onCancelAdd?.()
        }}
      >
        <TreeContextMenu
          node={node}
          onEdit={handleSelect}
          onAddChild={handleStartAdd}
          onDelete={node.type !== 'direction' ? handleDelete : undefined}
        >
          <div
            className={cn(
              'group/node relative transition-opacity duration-200',
              isFocusDimmed && 'opacity-[0.35] hover:opacity-[0.55]'
            )}
          >
            {cardElement}

            {/* [+] button — appears on hover, positioned at right edge */}
            {canAdd && onStartAdd && !isFocusDimmed && (
              <Popover.Trigger asChild>
                <button
                  className="absolute top-1/2 -right-3 z-10 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--color-primary-200)] bg-[var(--color-bg-primary)] text-[var(--color-primary-500)] opacity-0 shadow-sm transition-all group-hover/node:opacity-100 hover:bg-[var(--color-primary-50)] hover:shadow-md"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartAdd(node.type, node.id)
                  }}
                  title={getAddLabel(node.type)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Popover.Trigger>
            )}
          </div>
        </TreeContextMenu>

        {/* Quick Add popover content */}
        {isAddingHere && getQuickAddContent && (
          <Popover.Portal>
            <Popover.Content
              side={isHorizontal ? 'bottom' : 'right'}
              sideOffset={12}
              align="center"
              className="animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-lg"
            >
              {getQuickAddContent(node)}
            </Popover.Content>
          </Popover.Portal>
        )}
      </Popover.Root>

      {/* Connector + children */}
      <AnimatePresence initial={false}>
        {effectiveExpanded && hasChildren && (
          <motion.div
            initial={
              isHorizontal
                ? { opacity: 0, width: 0, height: 'auto', overflow: 'hidden' as const }
                : { opacity: 0, height: 0, width: 'auto', overflow: 'hidden' as const }
            }
            animate={
              isHorizontal
                ? { opacity: 1, width: 'auto', height: 'auto', overflow: 'visible' as const }
                : { opacity: 1, height: 'auto', width: 'auto', overflow: 'visible' as const }
            }
            exit={
              isHorizontal
                ? { opacity: 0, width: 0, height: 'auto', overflow: 'hidden' as const }
                : { opacity: 0, height: 0, width: 'auto', overflow: 'hidden' as const }
            }
            transition={{
              duration: 0.2,
              ease: 'easeInOut',
              overflow: { delay: 0.2 },
            }}
            className={isHorizontal ? 'flex flex-row items-center' : 'flex flex-col items-center'}
          >
            {/* Connector line from parent to children junction */}
            {isHorizontal ? (
              <div className="w-5 shrink-0 border-t-2 border-[var(--color-border-hover)]" />
            ) : (
              <div className="h-5 shrink-0 border-l-2 border-[var(--color-border-hover)]" />
            )}

            {/* Children container */}
            <div className={isHorizontal ? 'flex flex-col' : 'flex'}>
              {node.children!.map((child, index) => (
                <ChildBranch
                  key={child.id}
                  child={child}
                  index={index}
                  total={node.children!.length}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={onNodeSelect}
                  isFormMode={isFormMode}
                  layoutDirection={layoutDirection}
                  addingToId={addingToId}
                  onStartAdd={onStartAdd}
                  onCancelAdd={onCancelAdd}
                  getQuickAddContent={getQuickAddContent}
                  focusedIds={focusedIds}
                  searchMatchedIds={searchMatchedIds}
                  searchQuery={searchQuery}
                  onDeleteNode={onDeleteNode}
                  parentGoalMap={parentGoalMap}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

/**
 * Each child draws its portion of the connector bar
 * plus a stub connecting to the child node.
 */
const ChildBranch = memo(function ChildBranch({
  child,
  index,
  total,
  selectedNodeId,
  onNodeSelect,
  isFormMode,
  layoutDirection,
  addingToId,
  onStartAdd,
  onCancelAdd,
  getQuickAddContent,
  focusedIds,
  searchMatchedIds,
  searchQuery,
  onDeleteNode,
  parentGoalMap,
}: {
  child: VisualTreeNode
  index: number
  total: number
  selectedNodeId: string | null
  onNodeSelect: (type: SelectedNodeType, id: string) => void
  isFormMode: boolean
  layoutDirection: TreeLayoutDirection
  addingToId?: string | null
  onStartAdd?: (type: SelectedNodeType, id: string) => void
  onCancelAdd?: () => void
  getQuickAddContent?: (node: VisualTreeNode) => ReactNode
  focusedIds: Set<string> | null
  searchMatchedIds: Set<string>
  searchQuery: string
  onDeleteNode: (type: SelectedNodeType, id: string) => void
  parentGoalMap: Map<string, string>
}) {
  const isFirst = index === 0
  const isLast = index === total - 1
  const isOnly = total === 1
  const isHorizontal = layoutDirection === 'horizontal'

  if (isHorizontal) {
    return (
      <div className="relative flex flex-row items-center py-2">
        {!isOnly && (
          <>
            {!isFirst && (
              <div className="absolute top-0 left-0 h-1/2 w-0.5 bg-[var(--color-border-hover)]" />
            )}
            {!isLast && (
              <div className="absolute top-1/2 left-0 h-1/2 w-0.5 bg-[var(--color-border-hover)]" />
            )}
          </>
        )}
        {!isOnly && <div className="w-5 shrink-0 border-t-2 border-[var(--color-border-hover)]" />}
        <TreeNode
          node={child}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          isFormMode={isFormMode}
          layoutDirection={layoutDirection}
          addingToId={addingToId}
          onStartAdd={onStartAdd}
          onCancelAdd={onCancelAdd}
          getQuickAddContent={getQuickAddContent}
          focusedIds={focusedIds}
          searchMatchedIds={searchMatchedIds}
          searchQuery={searchQuery}
          onDeleteNode={onDeleteNode}
          parentGoalMap={parentGoalMap}
        />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center px-3">
      {!isOnly && (
        <>
          {!isFirst && (
            <div className="absolute top-0 left-0 h-0.5 w-1/2 bg-[var(--color-border-hover)]" />
          )}
          {!isLast && (
            <div className="absolute top-0 left-1/2 h-0.5 w-1/2 bg-[var(--color-border-hover)]" />
          )}
        </>
      )}
      {!isOnly && <div className="h-5 shrink-0 border-l-2 border-[var(--color-border-hover)]" />}
      <TreeNode
        node={child}
        selectedNodeId={selectedNodeId}
        onNodeSelect={onNodeSelect}
        isFormMode={isFormMode}
        layoutDirection={layoutDirection}
        addingToId={addingToId}
        onStartAdd={onStartAdd}
        onCancelAdd={onCancelAdd}
        getQuickAddContent={getQuickAddContent}
        focusedIds={focusedIds}
        searchMatchedIds={searchMatchedIds}
        searchQuery={searchQuery}
        onDeleteNode={onDeleteNode}
        parentGoalMap={parentGoalMap}
      />
    </div>
  )
})

function getDefaultExpanded(node: VisualTreeNode): boolean {
  if (node.type === 'direction') return true
  if (node.type === 'area') return true
  if (node.type === 'goal') return node.status === 'active'
  if (node.type === 'group') return false
  return false
}

function getAddLabel(type: SelectedNodeType): string {
  switch (type) {
    case 'direction':
      return '영역 추가'
    case 'area':
      return '목표 추가'
    case 'goal':
      return '할 일 추가'
    case 'group':
      return '할 일 추가'
    default:
      return '추가'
  }
}
