export const ANALYTICS_EVENTS = {
  // Auth
  AUTH_SIGNUP: 'auth_signup',
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_NEXT: 'onboarding_step_next',
  ONBOARDING_STEP_BACK: 'onboarding_step_back',
  ONBOARDING_STEP_SKIPPED: 'onboarding_step_skipped',
  ONBOARDING_AI_ENHANCE_REQUESTED: 'onboarding_ai_enhance_requested',
  ONBOARDING_AI_ENHANCE_FAILED: 'onboarding_ai_enhance_failed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  // Check-in
  CHECKIN_DONE: 'checkin_done',
  CHECKIN_SKIP: 'checkin_skip',
  CHECKIN_UNDO: 'checkin_undo',
  // Goal
  GOAL_CREATED: 'goal_created',
  GOAL_STATUS_CHANGED: 'goal_status_changed',
  GOAL_COMPLETED: 'goal_completed',
  // Task
  TASK_CREATED: 'task_created',
  // Navigation
  TAB_SWITCHED: 'tab_switched',
  // Reflection
  REFLECTION_SAVED: 'reflection_saved',
  // AI
  AI_CHAT_STARTED: 'ai_chat_started',
  // Roadmap
  ROADMAP_VERSION_CREATED: 'roadmap_version_created',
  // Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  // Task lifecycle
  TASK_COMPLETED: 'task_completed',
  // Goal engagement
  GOAL_DETAIL_VIEWED: 'goal_detail_viewed',
  // Streak milestones
  STREAK_MILESTONE: 'streak_milestone',
  // Priority feature
  PRIORITY_RANK_USED: 'priority_rank_used',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
