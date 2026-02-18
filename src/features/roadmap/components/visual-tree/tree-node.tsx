'use client'

import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TreeNodeCard, type VisualTreeNode } from './tree-node-card'
import type { SelectedNodeType, TreeLayoutDirection } from '@/stores/roadmap.store'

interface TreeNodeProps {
  node: VisualTreeNode
  selectedNodeId: string | null
  onNodeSelect: (type: SelectedNodeType, id: string) => void
  isFormMode: boolean
  defaultExpanded?: boolean
  layoutDirection: TreeLayoutDirection
}

export const TreeNode = memo(function TreeNode({
  node,
  selectedNodeId,
  onNodeSelect,
  isFormMode,
  defaultExpanded,
  layoutDirection,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? getDefaultExpanded(node))

  const hasChildren = !!node.children && node.children.length > 0
  const isSelected = selectedNodeId === node.id
  const isHorizontal = layoutDirection === 'horizontal'

  return (
    <div className={isHorizontal ? 'flex flex-row items-center' : 'flex flex-col items-center'}>
      {/* The card itself */}
      <TreeNodeCard
        node={node}
        isSelected={isSelected}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onSelect={() => onNodeSelect(node.type, node.id)}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {/* Connector + children */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
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
 *
 * Vertical: horizontal bar segments + vertical stubs
 * Horizontal: vertical bar segments + horizontal stubs
 */
const ChildBranch = memo(function ChildBranch({
  child,
  index,
  total,
  selectedNodeId,
  onNodeSelect,
  isFormMode,
  layoutDirection,
}: {
  child: VisualTreeNode
  index: number
  total: number
  selectedNodeId: string | null
  onNodeSelect: (type: SelectedNodeType, id: string) => void
  isFormMode: boolean
  layoutDirection: TreeLayoutDirection
}) {
  const isFirst = index === 0
  const isLast = index === total - 1
  const isOnly = total === 1
  const isHorizontal = layoutDirection === 'horizontal'

  if (isHorizontal) {
    return (
      <div className="relative flex flex-row items-center py-2">
        {/* Vertical bar segments (each child draws its halves) */}
        {!isOnly && (
          <>
            {/* Top half of vertical bar */}
            {!isFirst && (
              <div className="absolute top-0 left-0 h-1/2 w-0.5 bg-[var(--color-border-hover)]" />
            )}
            {/* Bottom half of vertical bar */}
            {!isLast && (
              <div className="absolute top-1/2 left-0 h-1/2 w-0.5 bg-[var(--color-border-hover)]" />
            )}
          </>
        )}

        {/* Horizontal stub from vertical bar to child */}
        {!isOnly && <div className="w-5 shrink-0 border-t-2 border-[var(--color-border-hover)]" />}

        {/* Recursive child node */}
        <TreeNode
          node={child}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          isFormMode={isFormMode}
          layoutDirection={layoutDirection}
        />
      </div>
    )
  }

  // Vertical layout (existing behavior)
  return (
    <div className="relative flex flex-col items-center px-3">
      {/* Horizontal bar segments (each child draws its halves) */}
      {!isOnly && (
        <>
          {/* Left half of horizontal bar */}
          {!isFirst && (
            <div className="absolute top-0 left-0 h-0.5 w-1/2 bg-[var(--color-border-hover)]" />
          )}
          {/* Right half of horizontal bar */}
          {!isLast && (
            <div className="absolute top-0 left-1/2 h-0.5 w-1/2 bg-[var(--color-border-hover)]" />
          )}
        </>
      )}

      {/* Vertical stub from horizontal bar to child */}
      {!isOnly && <div className="h-5 shrink-0 border-l-2 border-[var(--color-border-hover)]" />}

      {/* Recursive child node */}
      <TreeNode
        node={child}
        selectedNodeId={selectedNodeId}
        onNodeSelect={onNodeSelect}
        isFormMode={isFormMode}
        layoutDirection={layoutDirection}
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
