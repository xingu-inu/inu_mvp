/**
 * Pure functions for computing sibling insertion positions during drag-reorder
 * on the Why Map canvas. No React, no xyflow imports.
 *
 * The caller (use-canvas-reorder) supplies sibling ids in sort_order plus the
 * spread-axis center coordinate for each sibling (x for a top-to-bottom layout,
 * y for a left-to-right layout). These helpers translate a dragged node's
 * current center into an insertion slot among its siblings, and then into the
 * `{leftId, rightId}` bounding pair used to derive a fractional sort_order.
 */

/**
 * Compute the target insertion index for a dragged node among siblings on a
 * given axis.
 *
 * The returned index is into the "others" array (siblings with the dragged id
 * removed), and is in the range `[0, others.length]`.
 *
 * If `draggedId` is not found in `siblingIds`, no exclusion happens and the
 * index is computed against the full sibling list.
 */
export function computeInsertIndex(
  draggedCenter: number,
  siblingCenters: number[],
  draggedId: string,
  siblingIds: string[]
): number {
  if (siblingIds.length === 0) {
    return 0
  }

  const others: { id: string; center: number }[] = []
  for (let i = 0; i < siblingIds.length; i++) {
    const id = siblingIds[i]
    if (id === draggedId) {
      continue
    }
    // Guard against mismatched array lengths: treat missing centers as 0.
    const center = i < siblingCenters.length ? siblingCenters[i] : 0
    others.push({ id, center })
  }

  if (others.length === 0) {
    return 0
  }

  let index = 0
  for (let i = 0; i < others.length; i++) {
    if (draggedCenter >= others[i].center) {
      index = i + 1
    } else {
      break
    }
  }
  return index
}

/**
 * Given the current sibling array (sorted by sort_order) and a target insert
 * index into the "others" array, return the `{leftId, rightId}` pair that
 * bound the insertion slot. Either may be null for "before first" / "after
 * last" insertions. Neither returned id will ever be the dragged id.
 */
export function boundingSiblings(
  insertIndex: number,
  siblingIds: string[],
  draggedId: string
): { leftId: string | null; rightId: string | null } {
  const others = siblingIds.filter((id) => id !== draggedId)

  if (others.length === 0) {
    return { leftId: null, rightId: null }
  }

  const clamped = Math.max(0, Math.min(insertIndex, others.length))
  const leftId = clamped === 0 ? null : others[clamped - 1]
  const rightId = clamped === others.length ? null : others[clamped]

  return { leftId, rightId }
}

/**
 * Return the left/right sibling ids that bounded the dragged node at drag
 * start, by looking up its original position in the full sibling list.
 * Returns null for either side when the dragged was first / last.
 */
export function originalBoundingSiblings(
  siblingIds: string[],
  draggedId: string
): { leftId: string | null; rightId: string | null } {
  const origIdx = siblingIds.indexOf(draggedId)
  if (origIdx < 0) return { leftId: null, rightId: null }
  const leftId = origIdx > 0 ? siblingIds[origIdx - 1] : null
  const rightId = origIdx < siblingIds.length - 1 ? siblingIds[origIdx + 1] : null
  return { leftId, rightId }
}

/**
 * Decide whether a sibling reorder drop is a no-op (same slot) based on
 * sort_order comparison. This is the canonical no-op check used by
 * `onNodeDragStop` — kept as a pure function so it can be unit-tested
 * independently of the React Flow drag lifecycle.
 *
 * Semantics:
 * - If `currentOrder` is null (the dragged node has no sort_order yet — e.g.
 *   legacy data or a fractional-index fallback in flight), the caller should
 *   fall back to bounding-id comparison. Returns false here so the caller
 *   proceeds through the id-based fallback path.
 * - Otherwise: the drop is a no-op when `currentOrder` is strictly between
 *   `leftOrder` and `rightOrder`. Null bounds are treated as ±∞.
 */
export function isNoOpSiblingDrop(
  currentOrder: string | null,
  leftOrder: string | null,
  rightOrder: string | null
): boolean {
  if (currentOrder === null) return false
  const okLeft = leftOrder === null || currentOrder > leftOrder
  const okRight = rightOrder === null || currentOrder < rightOrder
  return okLeft && okRight
}

/**
 * Fallback no-op check used when `currentOrder` is null. Compares the new
 * bounding sibling ids against the dragged node's original bounding siblings.
 * Matches → same slot → no-op.
 */
export function isNoOpSiblingDropByIds(
  siblingIds: string[],
  draggedId: string,
  newLeftId: string | null,
  newRightId: string | null
): boolean {
  const { leftId: origLeft, rightId: origRight } = originalBoundingSiblings(siblingIds, draggedId)
  return newLeftId === origLeft && newRightId === origRight
}
