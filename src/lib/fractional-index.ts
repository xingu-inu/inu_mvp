import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

export { generateNKeysBetween }

/** Sanitize a sort_order key — return null for legacy numeric strings */
function sanitizeKey(key: string | null | undefined): string | null {
  if (!key) return null
  // Numeric-only strings (e.g. "1", "23") are invalid fractional-indexing keys
  if (/^\d+$/.test(key)) return null
  return key
}

/** Wrapper around generateKeyBetween with legacy sort_order handling */
function safeGenerateKeyBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(sanitizeKey(a), sanitizeKey(b))
}

/**
 * Generate a new order value between two items
 * Used for inserting an item between two existing items
 */
export function getNewOrderBetween(beforeOrder: string | null, afterOrder: string | null): string {
  return safeGenerateKeyBetween(beforeOrder, afterOrder)
}

/**
 * Calculate new order when moving an item from one position to another
 */
export function getNewOrder<T extends { sort_order: string }>(
  items: T[],
  fromIndex: number,
  toIndex: number
): string {
  // Same position, no change needed
  if (fromIndex === toIndex) {
    return items[fromIndex].sort_order
  }

  // Create a copy without the moving item
  const itemsWithoutMoving = items.filter((_, i) => i !== fromIndex)

  // Adjust target index if moving forward
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex

  // Moving to the beginning
  if (adjustedToIndex === 0) {
    return safeGenerateKeyBetween(null, itemsWithoutMoving[0]?.sort_order ?? null)
  }

  // Moving to the end
  if (adjustedToIndex >= itemsWithoutMoving.length) {
    return safeGenerateKeyBetween(
      itemsWithoutMoving[itemsWithoutMoving.length - 1]?.sort_order ?? null,
      null
    )
  }

  // Moving to the middle
  const beforeItem = itemsWithoutMoving[adjustedToIndex - 1]
  const afterItem = itemsWithoutMoving[adjustedToIndex]

  return safeGenerateKeyBetween(beforeItem?.sort_order ?? null, afterItem?.sort_order ?? null)
}

/**
 * Generate initial order for a new item (appended to the end)
 */
export function getInitialOrder<T extends { sort_order: string }>(items: T[]): string {
  if (items.length === 0) {
    return safeGenerateKeyBetween(null, null)
  }

  const lastItem = items[items.length - 1]
  return safeGenerateKeyBetween(lastItem.sort_order, null)
}

/**
 * Generate initial order for a new item (prepended to the beginning)
 */
export function getPrependOrder<T extends { sort_order: string }>(items: T[]): string {
  if (items.length === 0) {
    return safeGenerateKeyBetween(null, null)
  }

  const firstItem = items[0]
  return safeGenerateKeyBetween(null, firstItem.sort_order)
}

/**
 * Generate order for inserting at a specific index
 */
export function getOrderAtIndex<T extends { sort_order: string }>(
  items: T[],
  index: number
): string {
  if (items.length === 0 || index === 0) {
    return getPrependOrder(items)
  }

  if (index >= items.length) {
    return getInitialOrder(items)
  }

  const beforeItem = items[index - 1]
  const afterItem = items[index]

  return safeGenerateKeyBetween(beforeItem?.sort_order ?? null, afterItem?.sort_order ?? null)
}

// ─── DnD-specific fractional key utilities ───────────────────────────────────
// These use a stricter validity check (first char must be a–z) appropriate for
// drag-and-drop reorder operations where legacy numeric keys may appear.

/** Returns true if the key starts with a lowercase letter (valid fractional-indexing key) */
export function isValidFractionalKey(key: string): boolean {
  return key.length > 0 && key[0] >= 'a' && key[0] <= 'z'
}

/** Returns null for invalid or missing fractional keys (DnD variant) */
export function dndSanitizeKey(key: string | null): string | null {
  if (key == null) return null
  return isValidFractionalKey(key) ? key : null
}

/**
 * Safe wrapper around getNewOrderBetween for DnD reorder.
 * Guards against duplicate/corrupt sort_order pairs where a >= b.
 */
export function safeNewOrderBetween(before: string | null, after: string | null): string {
  const a = dndSanitizeKey(before)
  const b = dndSanitizeKey(after)
  // Guard: if both keys exist and a >= b (duplicate/corrupt sort_order), fall back to appending after a
  if (a != null && b != null && a >= b) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DnD] sort_order 충돌: "${a}" >= "${b}". append fallback 사용`)
    }
    return getNewOrderBetween(a, null)
  }
  return getNewOrderBetween(a, b)
}
