// AI Feature Types for Roadmap Integration

export type AiFeatureType =
  | 'goal-brainstorm'
  | 'decompose'
  | 'why-vision'
  | 'review'
  | 'brain-dump'
  | 'roadmap-diagnosis'

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

// ── Brain Dump Types ──

export interface AiBrainDumpExistingArea {
  id: string
  name: string
  type: string
  emoji: string
  color: string
}

export interface AiBrainDumpContext {
  direction?: string | null
  existingAreas: AiBrainDumpExistingArea[]
  existingGoals: string[]
}

export interface AiBrainDumpRequest {
  type: 'brain-dump'
  input: string
  context: AiBrainDumpContext
}

export interface AiBrainDumpTask {
  name: string
  why?: string
  repeat_type: string
  duration_minutes: number
  time_slot: string
}

export interface AiBrainDumpGoal {
  name: string
  why?: string
  tasks: AiBrainDumpTask[]
}

export interface AiBrainDumpArea {
  name: string
  emoji: string
  color: string
  type: string
  isExisting: boolean
  existingAreaId?: string
  goals: AiBrainDumpGoal[]
}

export interface AiBrainDumpResponse {
  type: 'brain-dump'
  summary: string
  organizedItems: AiBrainDumpArea[]
}

// ── Roadmap Diagnosis Types ──

export type DiagnosisScope = 'full' | 'area' | 'goal'

export type DiagnosisActionType =
  | 'add-why'
  | 'pause-goal'
  | 'activate-goal'
  | 'add-task'
  | 'set-deadline'
  | 'add-goal'
  | 'none'

export interface DiagnosisAction {
  type: DiagnosisActionType
  targetType: 'area' | 'goal' | 'task'
  targetId: string
  targetName: string
  label: string
}

export interface DiagnosisSummary {
  icon: string
  label: string
  description: string
}

export interface DiagnosisStrength {
  icon: string
  text: string
}

export interface DiagnosisObservation {
  id: string
  title: string
  icon: string
  description: string
  findings: Array<{
    text: string
    action?: DiagnosisAction
  }>
}

export interface DiagnosisNextStep {
  text: string
  action?: DiagnosisAction
}

export interface DiagnosisAreaData {
  id: string
  name: string
  emoji: string
  type: string
  why: string | null
}

export interface DiagnosisGoalData {
  id: string
  areaId: string
  name: string
  why: string | null
  status: string
  targetDate: string | null
  groupCount: number
  taskCount: number
}

export interface DiagnosisTaskData {
  id: string
  goalId: string
  name: string
  why: string | null
  repeatType: string
  timeSlot: string
  durationMinutes: number
  streakCount: number
}

export interface DiagnosisStats {
  totalAreas: number
  totalGoals: number
  activeGoals: number
  backlogGoals: number
  totalTasks: number
  goalsWithoutWhy: number
  areasWithoutWhy: number
  tasksWithoutWhy: number
  goalsWithoutTasks: number
  avgTasksPerGoal: number
}

export interface AiRoadmapDiagnosisContext {
  direction: string | null
  areas: DiagnosisAreaData[]
  goals: DiagnosisGoalData[]
  tasks: DiagnosisTaskData[]
  stats: DiagnosisStats
}

export interface AiRoadmapDiagnosisRequest {
  type: 'roadmap-diagnosis'
  scope: DiagnosisScope
  targetId?: string
  context: AiRoadmapDiagnosisContext
}

export interface AiRoadmapDiagnosisResponse {
  type: 'roadmap-diagnosis'
  scope: DiagnosisScope
  targetName?: string
  summary: DiagnosisSummary
  strengths: DiagnosisStrength[]
  observations: DiagnosisObservation[]
  nextSteps: DiagnosisNextStep[]
}

// ── Task Suggest Types (Home AI 할일 추천) ──

export interface AiTaskSuggestGoalData {
  id: string
  name: string
  areaId: string
  areaName: string
  areaEmoji: string
  status: string
  why: string | null
}

export interface AiTaskSuggestContext {
  direction: string | null
  areas: Array<{ id: string; name: string; emoji: string; type: string; why: string | null }>
  goals: AiTaskSuggestGoalData[]
  existingTasks: Array<{ name: string; goalId: string | null }>
}

export interface AiTaskSuggestRequest {
  type: 'task-suggest'
  context: AiTaskSuggestContext
}

export interface AiTaskSuggestBatchContext {
  goals: Array<{
    id: string
    name: string
    areaType: string
  }>
  existingTasks?: string[]
}

export interface AiTaskSuggestBatchRequest {
  type: 'task-suggest-batch'
  context: AiTaskSuggestBatchContext
}

export interface AiSuggestedTask {
  name: string
  why?: string
  repeat_type: string
  duration_minutes: number
  time_slot: string
}

export interface AiTaskSuggestGoalGroup {
  goalId: string | null
  goalName: string
  areaEmoji: string
  areaId?: string
  tasks: AiSuggestedTask[]
}

export interface AiTaskSuggestResponse {
  type: 'task-suggest'
  summary: string
  suggestions: AiTaskSuggestGoalGroup[]
}

export interface AiTaskSuggestBatchItem {
  goalId: string
  tasks: Array<{ name: string }>
}

export interface AiTaskSuggestBatchResponse {
  type: 'task-suggest-batch'
  summary: string
  suggestions: AiTaskSuggestBatchItem[]
}

// ── Priority Rank Types (Home 우선순위 정리) ──

export interface AiPriorityTaskData {
  id: string
  name: string
  goalId: string | null
  goalName: string | null
  areaEmoji: string | null
  timeSlot: string
  durationMinutes: number
  repeatType: string
  streakCount: number
  why: string | null
}

export interface AiPriorityRankContext {
  direction: string | null
  areas: Array<{ id: string; name: string; emoji: string; why: string | null }>
  goals: Array<{
    id: string
    name: string
    areaId: string
    status: string
    why: string | null
    targetDate: string | null
    taskCount: number
  }>
  allActiveTasks: AiPriorityTaskData[]
}

export interface AiPriorityRankRequest {
  type: 'priority-rank'
  context: AiPriorityRankContext
}

export interface AiPriorityGoalTask {
  taskId: string
  taskName: string
  reason: string
}

export interface AiPriorityGoal {
  goalId: string | null
  goalName: string
  areaEmoji: string | null
  areaName: string | null
  goalReason: string
  tasks: AiPriorityGoalTask[]
}

export interface AiPriorityTier {
  tier: number
  label: string
  icon: string
  goals: AiPriorityGoal[]
}

export interface AiPriorityRankResponse {
  type: 'priority-rank'
  summary: string
  tiers: AiPriorityTier[]
  insight: string
}

// ── Review Insight Types (Review AI 분석) ──

export interface AiReviewInsightContext {
  period: 'week' | 'month'
  periodLabel: string
  completionRate: number
  activeDays: number
  totalDays: number
  avgMoodLabel: string
  moodTrend: Array<{ date: string; mood: string }>
  topStreaks: Array<{ taskName: string; count: number; areaName: string }>
  areaBalances: Array<{ areaName: string; completionRate: number }>
  weeklyReflection?: { highlight?: string; challenge?: string; next_focus?: string }
}

export interface AiReviewInsightRequest {
  type: 'review-insight'
  context: AiReviewInsightContext
}

export interface AiReviewInsightPatternItem {
  icon: string
  text: string
}

export interface AiReviewInsightResponse {
  type: 'review-insight'
  patterns: AiReviewInsightPatternItem[]
  coaching: AiReviewInsightPatternItem[]
  encouragement: string
}

// ── Area Analysis Types (Review 영역별 AI 분석) ──

export interface AiAreaAnalysisContext {
  period: 'week' | 'month'
  periodLabel: string
  areaName: string
  areaEmoji: string
  areaWhy: string | null
  periodCompletionRate: number
  goals: Array<{
    name: string
    status: string
    why: string | null
    completionRate: number
    taskCount: number
  }>
  tasks: Array<{
    name: string
    why: string | null
    completionRate: number
    totalDone: number
    totalScheduled: number
    streakCount: number
    bestStreak: number
  }>
}

export interface AiAreaAnalysisRequest {
  type: 'area-analysis'
  context: AiAreaAnalysisContext
}

export interface AiAreaAnalysisResponse {
  type: 'area-analysis'
  patterns: AiReviewInsightPatternItem[]
  coaching: AiReviewInsightPatternItem[]
  encouragement: string
}

export type AiGenerateRequest =
  | AiGoalBrainstormRequest
  | AiDecomposeRequest
  | AiWhyVisionRequest
  | AiReviewRequest
  | AiBrainDumpRequest
  | AiRoadmapDiagnosisRequest
  | AiTaskSuggestRequest
  | AiTaskSuggestBatchRequest
  | AiPriorityRankRequest
  | AiReviewInsightRequest
  | AiAreaAnalysisRequest

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
  | AiBrainDumpResponse
  | AiRoadmapDiagnosisResponse
  | AiTaskSuggestResponse
  | AiTaskSuggestBatchResponse
  | AiPriorityRankResponse
  | AiReviewInsightResponse
  | AiAreaAnalysisResponse
