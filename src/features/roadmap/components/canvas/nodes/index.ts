import type { NodeTypes } from '@xyflow/react'
import { DirectionNode } from './direction-node'
import { AreaNode } from './area-node'
import { GoalNode } from './goal-node'
import { GroupNode } from './group-node'
import { TaskNode } from './task-node'
import { StickyNode } from './sticky-node'

/**
 * nodeTypes must be defined at module scope (outside any component)
 * to prevent ReactFlow from remounting all nodes on every render.
 */
export const nodeTypes: NodeTypes = {
  direction: DirectionNode,
  area: AreaNode,
  goal: GoalNode,
  group: GroupNode,
  task: TaskNode,
  sticky: StickyNode,
}
