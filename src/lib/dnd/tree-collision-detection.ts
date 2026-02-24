import type { CollisionDetection, DroppableContainer } from '@dnd-kit/core'

interface TreeCollisionConfig {
  zoom: number
  /** IDs of valid drop targets (siblings + group-drop targets) */
  validTargetIds: Set<string>
}

export function createTreeCollisionDetection(config: TreeCollisionConfig): CollisionDetection {
  return (args) => {
    const { droppableRects, droppableContainers, pointerCoordinates } = args
    if (!pointerCoordinates) return []

    // Compensate for CSS zoom: pointer coords are viewport-space,
    // but @dnd-kit's internal coordinate tracking may be off.
    // We divide pointer by zoom to match element rects.
    const adjustedX = pointerCoordinates.x / config.zoom
    const adjustedY = pointerCoordinates.y / config.zoom

    // Filter to only valid targets
    const validContainers = droppableContainers.filter((container: DroppableContainer) =>
      config.validTargetIds.has(container.id as string)
    )

    if (validContainers.length === 0) return []

    // Separate group-drop targets from insertion targets
    const groupTargets = validContainers.filter((c) => (c.id as string).startsWith('group-drop-'))
    const insertionTargets = validContainers.filter((c) => (c.id as string).startsWith('insert-'))

    // Priority 1: Check if pointer is INSIDE a group-drop rect
    for (const container of groupTargets) {
      const rect = droppableRects.get(container.id)
      if (!rect) continue
      if (
        adjustedX >= rect.left &&
        adjustedX <= rect.left + rect.width &&
        adjustedY >= rect.top &&
        adjustedY <= rect.top + rect.height
      ) {
        return [{ id: container.id }]
      }
    }

    // Priority 2: Closest insertion indicator by Euclidean distance
    let closest: DroppableContainer | null = null
    let minDistance = Infinity

    for (const container of insertionTargets) {
      const rect = droppableRects.get(container.id)
      if (!rect) continue

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distance = Math.sqrt((adjustedX - centerX) ** 2 + (adjustedY - centerY) ** 2)

      if (distance < minDistance) {
        minDistance = distance
        closest = container
      }
    }

    return closest ? [{ id: closest.id }] : []
  }
}
