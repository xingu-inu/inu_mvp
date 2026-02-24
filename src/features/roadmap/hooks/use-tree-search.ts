'use client'

import { useMemo, useCallback, useReducer } from 'react'
import type { VisualTreeNode } from '../components/visual-tree/tree-node-card'

export interface TreeSearchResult {
  matchedIds: Set<string>
  orderedMatches: string[]
  currentIndex: number
  total: number
  setCurrentIndex: (idx: number) => void
  goNext: () => void
  goPrev: () => void
}

function dfsCollectMatches(
  node: VisualTreeNode,
  query: string,
  orderedMatches: string[],
  directMatchIds: Set<string>
): void {
  const nameMatches = node.name.toLowerCase().includes(query.toLowerCase())
  if (nameMatches) {
    directMatchIds.add(node.id)
    orderedMatches.push(node.id)
  }
  if (node.children) {
    for (const child of node.children) {
      dfsCollectMatches(child, query, orderedMatches, directMatchIds)
    }
  }
}

function collectAncestorIds(
  node: VisualTreeNode,
  directMatchIds: Set<string>,
  ancestorIds: Set<string>,
  ancestorPath: string[]
): void {
  const currentPath = [...ancestorPath, node.id]
  if (directMatchIds.has(node.id)) {
    for (const ancestorId of ancestorPath) {
      ancestorIds.add(ancestorId)
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectAncestorIds(child, directMatchIds, ancestorIds, currentPath)
    }
  }
}

type IndexAction =
  | { type: 'set'; value: number }
  | { type: 'next'; total: number }
  | { type: 'prev'; total: number }

function indexReducer(_state: number, action: IndexAction): number {
  switch (action.type) {
    case 'set':
      return action.value
    case 'next':
      return action.total === 0 ? 0 : (_state + 1) % action.total
    case 'prev':
      return action.total === 0 ? 0 : (_state - 1 + action.total) % action.total
  }
}

export function useTreeSearch(tree: VisualTreeNode | null, query: string): TreeSearchResult {
  const [currentIndex, dispatch] = useReducer(indexReducer, 0)

  const { matchedIds, orderedMatches } = useMemo(() => {
    // Reset index when query changes — dispatch is stable (React guarantee)
    dispatch({ type: 'set', value: 0 })

    if (!query || query.trim().length < 1 || !tree) {
      return { matchedIds: new Set<string>(), orderedMatches: [] as string[] }
    }

    const directMatchIds = new Set<string>()
    const ordered: string[] = []
    dfsCollectMatches(tree, query, ordered, directMatchIds)

    const ancestorIds = new Set<string>()
    collectAncestorIds(tree, directMatchIds, ancestorIds, [])

    const combined = new Set<string>([...directMatchIds, ...ancestorIds])
    return { matchedIds: combined, orderedMatches: ordered }
  }, [tree, query])

  const total = orderedMatches.length

  const goNext = useCallback(() => {
    dispatch({ type: 'next', total })
  }, [total])

  const goPrev = useCallback(() => {
    dispatch({ type: 'prev', total })
  }, [total])

  const setCurrentIndex = useCallback((idx: number) => {
    dispatch({ type: 'set', value: idx })
  }, [])

  return {
    matchedIds,
    orderedMatches,
    currentIndex,
    total,
    setCurrentIndex,
    goNext,
    goPrev,
  }
}
