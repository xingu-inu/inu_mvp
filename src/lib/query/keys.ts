/**
 * Query Keys Factory
 * - 타입 안전한 쿼리 키 생성
 * - 관련 쿼리 일괄 무효화에 활용
 */
export const queryKeys = {
  // ============================================
  // Profile
  // ============================================
  profile: {
    me: ['profile', 'me'] as const,
  },

  // ============================================
  // Profile Traits
  // ============================================
  profileTraits: {
    all: ['profile-traits'] as const,
  },

  // ============================================
  // Direction
  // ============================================
  direction: {
    all: ['direction'] as const,
    history: ['direction', 'history'] as const,
    archived: (directionId: string) => ['direction', 'archived', directionId] as const,
  },

  // ============================================
  // Areas
  // ============================================
  areas: {
    all: ['areas'] as const,
    active: () => [...queryKeys.areas.all, 'active'] as const,
    detail: (id: string) => [...queryKeys.areas.all, id] as const,
  },

  // ============================================
  // Goals
  // ============================================
  goals: {
    all: ['goals'] as const,
    byStatus: (status: string) => [...queryKeys.goals.all, { status }] as const,
    byArea: (areaId: string) => [...queryKeys.goals.all, { areaId }] as const,
    detail: (id: string) => [...queryKeys.goals.all, 'detail', id] as const,
  },

  // ============================================
  // Groups
  // ============================================
  groups: {
    all: ['groups'] as const,
    byGoal: (goalId: string) => [...queryKeys.groups.all, { goalId }] as const,
    detail: (id: string) => [...queryKeys.groups.all, 'detail', id] as const,
  },

  // ============================================
  // Tasks
  // ============================================
  tasks: {
    all: ['tasks'] as const,
    home: (date: string, directionId?: string) =>
      [...queryKeys.tasks.all, 'home', date, directionId] as const,
    homeWeek: (weekStart: string, directionId?: string) =>
      [...queryKeys.tasks.all, 'home', 'week', weekStart, directionId] as const,
    byGoal: (goalId: string) => [...queryKeys.tasks.all, { goalId }] as const,
    byGroup: (groupId: string) => [...queryKeys.tasks.all, { groupId }] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
  },

  // ============================================
  // Check-ins
  // ============================================
  checkIns: {
    all: ['check-ins'] as const,
    byDate: (date: string) => [...queryKeys.checkIns.all, { date }] as const,
    byTask: (taskId: string, start: string, end: string) =>
      [...queryKeys.checkIns.all, { taskId, start, end }] as const,
  },

  // ============================================
  // Reflections
  // ============================================
  reflections: {
    all: ['reflections'] as const,
    byDate: (date: string) => [...queryKeys.reflections.all, { date }] as const,
    byRange: (start: string, end: string) =>
      [...queryKeys.reflections.all, { start, end }] as const,
  },

  // ============================================
  // Dashboard (RPC 기반)
  // ============================================
  dashboard: {
    home: ['dashboard', 'home'] as const,
    roadmap: ['dashboard', 'roadmap'] as const,
  },

  // ============================================
  // AI Messages
  // ============================================
  aiMessages: {
    all: ['ai-messages'] as const,
  },

  // ============================================
  // Google Calendar
  // ============================================
  googleCalendar: {
    all: ['google-calendar'] as const,
    connection: () => ['google-calendar', 'connection'] as const,
    events: (weekStart: string) => ['google-calendar', 'events', weekStart] as const,
  },

  // ============================================
  // Calendar (Phase 8)
  // ============================================
  calendar: {
    all: ['calendar'] as const,
    week: (startDate: string) => [...queryKeys.calendar.all, 'week', startDate] as const,
    month: (yearMonth: string) => [...queryKeys.calendar.all, 'month', yearMonth] as const,
    unscheduled: () => [...queryKeys.calendar.all, 'unscheduled'] as const,
  },

  // ============================================
  // Review (Phase 9)
  // ============================================
  review: {
    stats: (start: string, end: string) => ['review', 'stats', start, end] as const,
    history: (start: string, end: string, directionId?: string) =>
      ['review', 'history', start, end, directionId] as const,
    areaStats: (start: string, end: string) => ['review', 'areaStats', start, end] as const,
    moods: (start: string, end: string) => ['review', 'moods', start, end] as const,
    areaGoalStats: (areaId: string, start: string, end: string) =>
      ['review', 'areaGoalStats', areaId, start, end] as const,
    goalCheckIns: (goalId: string, start: string, end: string) =>
      ['review', 'goalCheckIns', goalId, start, end] as const,
    roadmapProgress: (start: string, end: string, directionId?: string) =>
      ['review', 'roadmapProgress', start, end, directionId] as const,
    monthlyReflection: (monthStart: string) =>
      ['review', 'monthly-reflection', monthStart] as const,
    weeklyReflection: (weekStart: string) => ['review', 'weekly-reflection', weekStart] as const,
    goalReflection: (goalId: string, start: string, end: string) =>
      ['review', 'goal-reflection', goalId, start, end] as const,
    goalReflections: (start: string, end: string) =>
      ['review', 'goal-reflections', start, end] as const,
    activityLog: (directionId?: string) => ['review', 'activity-log', directionId] as const,
    areaActivityLog: (areaId: string, directionId?: string) =>
      ['review', 'area-activity-log', areaId, directionId] as const,
    goalJourney: (goalId: string) => ['review', 'goal-journey', goalId] as const,
    obstacleAnalysis: (start: string, end: string) =>
      ['review', 'obstacle-analysis', start, end] as const,
  },
  // ============================================
  // Notifications (computed from tasks/goals)
  // ============================================
  notifications: {
    today: () => ['notifications', 'today'] as const,
  },

  // ============================================
  // Chat (AI Coach)
  // ============================================
  chat: {
    conversations: ['chat', 'conversations'] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  },
  // ============================================
  // Admin
  // ============================================
  admin: {
    stats: ['admin', 'stats'] as const,
    signupChart: (days: number) => ['admin', 'signup-chart', days] as const,
    users: (params: { search?: string; page?: number }) => ['admin', 'users', params] as const,
    userDetail: (id: string) => ['admin', 'user', id] as const,
    announcements: ['admin', 'announcements'] as const,
    feedbacks: (params: { status?: string; page?: number }) =>
      ['admin', 'feedbacks', params] as const,
    engagement: (days: number) => ['admin', 'engagement', days] as const,
    funnel: ['admin', 'funnel'] as const,
    retention: (cohortCount: number) => ['admin', 'retention', cohortCount] as const,
    featureAdoption: ['admin', 'feature-adoption'] as const,
    streakDistribution: ['admin', 'streak-distribution'] as const,
  },

  // ============================================
  // Announcements (user-facing)
  // ============================================
  announcements: {
    active: ['announcements', 'active'] as const,
  },

  // ============================================
  // Feedbacks (user-facing)
  // ============================================
  feedbacks: {
    mine: ['feedbacks', 'mine'] as const,
  },
} as const

export type QueryKeys = typeof queryKeys
