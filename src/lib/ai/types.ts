// AI Feature Types for Roadmap Integration

export type AiFeatureType = 'goal-brainstorm' | 'decompose' | 'why-vision' | 'review'

/** Context passed to every AI call — all fields optional */
export interface AiContext {
  direction?: string | null
  areaName?: string | null
  areaType?: string | null
  areaWhy?: string | null
  goalName?: string | null
  goalWhy?: string | null
  groupName?: string | null
  groupDescription?: string | null
  existingGoals?: string[]
  existingGroups?: string[]
  existingTasks?: string[]
}

// ── Request Types (discriminated union) ──

export interface AiGoalBrainstormRequest {
  type: 'goal-brainstorm'
  context: AiContext
}

export interface AiDecomposeRequest {
  type: 'decompose'
  context: AiContext
  decomposeTarget: 'groups' | 'tasks' | 'both'
}

export interface AiWhyVisionRequest {
  type: 'why-vision'
  context: AiContext
  target: 'area-why' | 'goal-why' | 'group-why' | 'task-why' | 'direction-why'
}

export interface AiReviewRequest {
  type: 'review'
  context: AiContext
}

export type AiGenerateRequest =
  | AiGoalBrainstormRequest
  | AiDecomposeRequest
  | AiWhyVisionRequest
  | AiReviewRequest

// ── Response Types ──

export interface AiSuggestionItem {
  text: string
  description?: string
}

export interface AiGoalBrainstormResponse {
  type: 'goal-brainstorm'
  suggestions: AiSuggestionItem[]
}

export interface AiDecomposeGroup {
  name: string
  description?: string
  tasks?: AiDecomposeTask[]
}

export interface AiDecomposeTask {
  name: string
  why?: string
  repeat_type?: string
  duration_minutes?: number
  time_slot?: string
}

export interface AiDecomposeResponse {
  type: 'decompose'
  groups?: AiDecomposeGroup[]
  tasks?: AiDecomposeTask[]
}

export interface AiWhyVisionResponse {
  type: 'why-vision'
  suggestions: AiSuggestionItem[]
}

export interface AiReviewResponse {
  type: 'review'
  analysis: string
  suggestions: AiSuggestionItem[]
  encouragement: string
}

export type AiGenerateResponse =
  | AiGoalBrainstormResponse
  | AiDecomposeResponse
  | AiWhyVisionResponse
  | AiReviewResponse
