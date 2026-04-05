// ============================================
// Base Types
// ============================================
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// ============================================
// Enums (matching database)
// ============================================
export type AreaType =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'hobbies'
  | 'mental'
  | 'learning'
  | 'daily'
  | 'custom'

export type GoalStatus = 'active' | 'backlog' | 'completed' | 'maintenance' | 'paused' | 'archived'

export type TaskStatus = 'active' | 'completed' | 'paused'

export type RepeatType = 'once' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'

export type TimeSlot =
  | 'dawn' // 0-6
  | 'morning' // 6-12
  | 'afternoon' // 12-18
  | 'evening' // 18-24
  | 'anytime'

export type CheckInStatus = 'done' | 'skip' | 'miss'

export type DirectionStatus = 'active' | 'archived'

export type MessageType = 'celebration' | 'encouragement' | 'insight' | 'suggestion' | 'reminder'

// ============================================
// Entities
// ============================================
export interface Profile extends BaseEntity {
  email: string
  name: string | null
  avatar_url: string | null
  timezone: string
  onboarding_completed: boolean
  is_admin: boolean
  ai_model: string | null
}

export type TraitCategory =
  | 'identity'
  | 'stats'
  | 'interests'
  | 'description'
  | 'habits'
  | 'general'

export interface TraitHistoryEntry {
  value: string
  changed_at: string // ISO timestamp
}

export interface ProfileTrait extends BaseEntity {
  user_id: string
  label: string
  value: string
  category: TraitCategory
  sort_order: string
  history: TraitHistoryEntry[]
}

export interface Direction extends BaseEntity {
  user_id: string
  statement: string
  why: string | null
  status: DirectionStatus
  version: number
  name: string | null
  archived_at: string | null
}

export interface Area extends BaseEntity {
  user_id: string
  direction_id: string
  name: string
  type: AreaType
  emoji: string
  color: string
  why: string | null
  sort_order: string // Fractional indexing (TEXT in DB)
  is_active: boolean
}

export interface Goal extends BaseEntity {
  user_id: string
  area_id: string
  name: string
  why: string | null
  vision: string | null
  status: GoalStatus
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  sort_order: string // Fractional indexing (TEXT in DB)
  status_change_reason: string | null
  status_change_note: string | null
  impact_area_ids: string[] // Secondary areas this goal also serves (max 3)
  // Relations (optional, for joined queries)
  area?: Area
  groups?: Group[]
  tasks?: Task[]
}

export interface Group extends BaseEntity {
  goal_id: string
  name: string
  why: string | null
  description: string | null
  is_completed: boolean
  sort_order: string // Fractional indexing (TEXT in DB)
  completed_at: string | null
}

export interface Task extends BaseEntity {
  user_id: string
  goal_id: string | null
  group_id: string | null
  area_id: string | null
  name: string
  why: string | null
  repeat_type: RepeatType
  repeat_days: number[] | null
  duration_minutes: number
  time_slot: TimeSlot
  specific_time: string | null
  streak_count: number
  best_streak: number
  last_check_in_date: string | null
  is_active: boolean
  status: TaskStatus
  scheduled_date: string | null
  start_date: string | null // YYYY-MM-DD, repeat start date
  end_date: string | null // YYYY-MM-DD, repeat end date (null = indefinite)
  completed_at: string | null
  paused_at: string | null
  status_change_reason: string | null
  status_change_note: string | null
  sort_order: string // Fractional indexing (TEXT in DB)
  related_area_ids: string[]
  related_goal_ids: string[]
  cross_link_group_map: Record<string, string | null>
  google_event_id: string | null
  // Relations
  goal?: Goal
  check_ins?: CheckIn[]
}

export interface CheckIn {
  id: string
  task_id: string
  user_id: string
  date: string
  status: CheckInStatus
  note: string | null
  created_at: string
}

export interface AIMessage {
  id: string
  user_id: string
  type: MessageType
  title: string
  content: string
  is_read: boolean
  related_goal_id: string | null
  related_task_id: string | null
  created_at: string
}

// ============================================
// Input Types (for mutations)
// ============================================
export interface CreateDirectionInput {
  statement: string
  why?: string
}

export interface UpdateDirectionInput {
  statement?: string
  why?: string
}

export interface CreateAreaInput {
  name: string
  type?: AreaType
  emoji: string
  color: string
  why?: string
  /** Client-only: pre-generated UUID for optimistic updates */
  _tempId?: string
}

export interface UpdateAreaInput {
  name?: string
  type?: AreaType
  emoji?: string
  color?: string
  why?: string
  is_active?: boolean
  sort_order?: string
}

export interface CreateGoalInput {
  area_id: string
  name: string
  why?: string
  vision?: string
  status?: GoalStatus
  start_date?: string
  target_date?: string
  impact_area_ids?: string[]
  /** Client-only: pre-generated UUID for optimistic updates */
  _tempId?: string
}

export interface UpdateGoalInput {
  name?: string
  why?: string
  vision?: string
  status?: GoalStatus
  start_date?: string
  target_date?: string
  sort_order?: string
  status_change_reason?: string
  status_change_note?: string
  impact_area_ids?: string[]
}

export interface CreateGroupInput {
  goal_id: string
  name: string
  why?: string
  description?: string
}

export interface UpdateGroupInput {
  name?: string
  why?: string
  description?: string
  is_completed?: boolean
  sort_order?: string
}

export interface CreateTaskInput {
  goal_id?: string
  group_id?: string
  area_id?: string
  name: string
  why?: string
  repeat_type?: RepeatType
  repeat_days?: number[]
  duration_minutes?: number
  time_slot?: TimeSlot
  specific_time?: string
  related_area_ids?: string[]
  related_goal_ids?: string[]
  scheduled_date?: string
  start_date?: string
  end_date?: string
  /** Client-only: pre-generated UUID for optimistic updates */
  _tempId?: string
}

export interface UpdateTaskInput {
  name?: string
  why?: string
  group_id?: string | null
  area_id?: string | null
  repeat_type?: RepeatType
  repeat_days?: number[]
  duration_minutes?: number
  time_slot?: TimeSlot
  specific_time?: string
  is_active?: boolean
  status?: TaskStatus
  scheduled_date?: string | null
  start_date?: string | null
  end_date?: string | null
  status_change_reason?: string
  status_change_note?: string
  sort_order?: string
  related_area_ids?: string[]
  related_goal_ids?: string[]
  cross_link_group_map?: Record<string, string | null>
}

export interface UpdateProfileInput {
  name?: string
  timezone?: string
  ai_model?: string
}

// ============================================
// AI Insights
// ============================================
export interface AiInsight extends BaseEntity {
  user_id: string
  title: string
  description: string
  sort_order: string
}

export interface CreateAiInsightInput {
  title: string
  description: string
}

export interface UpdateAiInsightInput {
  title?: string
  description?: string
}

export interface CreateProfileTraitInput {
  label: string
  value: string
  category?: TraitCategory
}

export interface UpdateProfileTraitInput {
  label?: string
  value?: string
  category?: TraitCategory
}

// ============================================
// Roadmap Versioning Types
// ============================================
export interface CreateRoadmapVersionInput {
  statement: string
  why?: string
  name?: string
  carryOverGoalIds: string[]
}

export interface RoadmapVersionResult {
  newDirectionId: string
  newVersion: number
  archivedDirectionId: string
  copiedGoalCount: number
}

export interface DeleteArchivedRoadmapResult {
  deletedDirectionId: string
  deletedVersion: number
  deletedAreaCount: number
  deletedGoalCount: number
  deletedTaskCount: number
}

export interface DirectionHistoryItem {
  id: string
  statement: string
  why: string | null
  name: string | null
  version: number
  status: DirectionStatus
  createdAt: string
  archivedAt: string | null
  goalCount: number
  areaCount: number
}

export interface ArchivedRoadmapData {
  direction: {
    id: string
    statement: string
    why: string | null
    name: string | null
    version: number
    status: DirectionStatus
    createdAt: string
    archivedAt: string | null
  }
  areas: Array<{
    id: string
    name: string
    emoji: string
    color: string
    type: AreaType
    why: string | null
    sortOrder: string
    isActive: boolean
  }>
  goals: Array<{
    id: string
    name: string
    areaId: string
    status: string
    why: string | null
    vision: string | null
    targetDate: string | null
    sortOrder: string
    groups: Array<{
      id: string
      name: string
      why: string | null
      isCompleted: boolean
    }>
    tasks: Array<{
      id: string
      name: string
      why: string | null
      groupId: string | null
      repeatType: string
      timeSlot: string
      durationMinutes: number
      status: string
    }>
    taskCount: number
  }>
}

// ============================================
// Announcement
// ============================================
export type AnnouncementType = 'info' | 'update' | 'event'

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  is_active: boolean
  created_by: string | null
  created_at: string
  expires_at: string | null
}

// ============================================
// Feedback
// ============================================
export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'improvement'
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved'

export interface Feedback {
  id: string
  user_id: string
  category: FeedbackCategory
  content: string
  status: FeedbackStatus
  admin_note: string | null
  created_at: string
  user?: {
    email: string
    name: string | null
  }
}

// ============================================
// Notifications (computed, no DB table)
// ============================================
export type NotificationType =
  | 'milestone_goal'
  | 'milestone_group'
  | 'deadline'
  | 'insight'
  | 'announcement'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  icon: string
  priority: number // 1-5 (5=highest)
  relatedGoalId?: string
  autoResolve: boolean // true = disappears when condition met
}

// ============================================
// Chat (AI Coach Conversations)
// ============================================
export type ChatContext = ChatEntityContext | ChatBrainDumpContext | ChatObservationContext

export interface ChatEntityContext {
  type: 'goal' | 'task'
  entityId: string
  entityName: string
  goalId: string
  goalName?: string
  areaName?: string
}

export interface ChatBrainDumpContext {
  type: 'brain-dump'
}

export interface ChatObservationContext {
  type: 'observation'
  message: string
  nodeId: string
  relatedGoalId?: string
}

export interface ChatConversation extends BaseEntity {
  user_id: string
  title: string
  related_goal_id: string | null
  related_task_id: string | null
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
