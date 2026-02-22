import type { CollisionDetection, DroppableContainer } from '@dnd-kit/core'

interface TreeCollisionConfig {
  zoom: number
  /** IDs of valid drop targets (only siblings of the dragged node) */
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

    // Filter to only valid sibling targets
    const validContainers = droppableContainers.filter((container: DroppableContainer) =>
      config.validTargetIds.has(container.id as string)
    )

    if (validContainers.length === 0) return []

    // Find closest valid container by Euclidean distance
    let closest: DroppableContainer | null = null
    let minDistance = Infinity

    for (const container of validContainers) {
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
