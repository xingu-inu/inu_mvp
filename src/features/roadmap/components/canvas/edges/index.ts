import type { EdgeTypes } from '@xyflow/react'
import { HierarchyEdge } from './hierarchy-edge'
import { SharedTaskEdge } from './shared-task-edge'
import { DependencyEdge } from './dependency-edge'

export const edgeTypes: EdgeTypes = {
  hierarchy: HierarchyEdge,
  'shared-task': SharedTaskEdge,
  dependency: DependencyEdge,
}
