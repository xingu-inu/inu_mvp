'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectStatusFilter } from '@/stores/roadmap.store'
import { useGoalVibeStore } from '@/stores/goal-vibe.store'
import { buildVisualTreeData } from './visual-tree'
import { VisualTreeSkeleton } from '../visual-tree-skeleton'
import { TreeSearchBar } from './tree-search-bar'
import { useTreeSearch } from '../../hooks/use-tree-search'
import { CommandPalette, buildRoadmapCommands } from './command-palette'
import { WhyMapCanvas, type WhyMapCanvasRef } from '../canvas/why-map-canvas'

interface VisualTreeWrapperProps {
  /**
   * View-only mode for mobile: disables DnD, hides hover/keyboard-only UI,
   * routes Goal taps to the existing Vaul bottom sheet.
   */
  isMobile?: boolean
}

export function VisualTreeWrapper({ isMobile = false }: VisualTreeWrapperProps) {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const setStatusFilter = useRoadmapStore((s) => s.setStatusFilter)
  const selection = useRoadmapStore((s) => s.selection)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const goalVibes = useGoalVibeStore((s) => s.goalVibes)
  const canvasRef = useRef<WhyMapCanvasRef>(null)

  // All three queries must be awaited before rendering the canvas.
  // Previously `direction` was not part of the loading gate, so on cold loads
  // where direction resolved AFTER goals/areas the canvas first rendered with
  // `direction=undefined` (root id = 'direction-root'), then re-rendered once
  // direction arrived (root id = actual UUID). That id change flipped the
  // `layoutSignature` in useElkLayout, triggering a second ELK pass right
  // after the first one — which the user saw as "rendering finished, then
  // it animated again".
  const { data: direction, isLoading: directionLoading } = useDirection()
  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: areas = [], isLoading: areasLoading } = useAreas()

  const isLoading = goalsLoading || areasLoading || directionLoading
  const activeAreas = useMemo(() => areas.filter((area) => area.is_active), [areas])

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Build tree ONCE — shared by search and canvas
  const { tree: treeData, crossLinks } = useMemo(
    () => buildVisualTreeData(direction ?? null, activeAreas, goals, statusFilter, goalVibes),
    [direction, activeAreas, goals, statusFilter, goalVibes]
  )

  const searchResult = useTreeSearch(treeData, searchQuery)

  // Search navigation → focus node in canvas
  const handleSearchNavigate = useCallback((nodeId: string) => {
    canvasRef.current?.focusNode(nodeId)
  }, [])

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditable =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false)
        } else if (isSearchOpen) {
          handleSearchClose()
        } else {
          clearSelection()
        }
        return
      }

      if (isEditable || isCommandPaletteOpen || isSearchOpen) return

      if (e.key === '/') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        canvasRef.current?.toggleMinimap()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        canvasRef.current?.fitView()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSearchOpen, isCommandPaletteOpen, handleSearchClose, clearSelection])

  // Command palette commands
  // eslint-disable-next-line react-hooks/refs
  const commands = buildRoadmapCommands({
    onOpenSearch: () => setIsSearchOpen(true),
    onZoomToFit: () => canvasRef.current?.fitView(),
    onToggleMinimap: () => canvasRef.current?.toggleMinimap(),
    onFilterStatus: () => {
      const statuses = [
        'all',
        'active',
        'backlog',
        'completed',
        'maintenance',
        'paused',
        'archived',
      ] as const
      const currentIndex = statuses.indexOf(statusFilter as (typeof statuses)[number])
      const next = statuses[(currentIndex + 1) % statuses.length]
      setStatusFilter(next)
    },
    onAddGoal: () => setInlineMode('create-goal'),
    onAddTask: () => setInlineMode('create-task'),
    hasGoalSelected: () =>
      selection.type === 'goal' || selection.type === 'group' || selection.type === 'task',
  })

  if (isLoading) {
    return <VisualTreeSkeleton />
  }

  return (
    <div className="relative min-h-0 flex-1">
      {/* Search bar + command palette are keyboard-only, so they never trigger
          on touch devices. Skip rendering on mobile to keep the DOM lean. */}
      {!isMobile && (
        <>
          <TreeSearchBar
            isOpen={isSearchOpen}
            onClose={handleSearchClose}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            currentIndex={searchResult.currentIndex}
            total={searchResult.total}
            onNext={searchResult.goNext}
            onPrev={searchResult.goPrev}
            onNavigate={handleSearchNavigate}
            orderedMatches={searchResult.orderedMatches}
          />
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            commands={commands}
          />
        </>
      )}

      {/* ReactFlow canvas */}
      <WhyMapCanvas
        ref={canvasRef}
        treeData={treeData}
        crossLinks={crossLinks}
        goals={goals}
        areas={activeAreas}
        searchQuery={searchQuery}
        searchMatchedIds={searchResult.matchedIds}
        isMobile={isMobile}
      />
    </div>
  )
}
