// Existing exports (Phase 3)
export { getHomeTasks, getWeekHomeTasks, type HomeTaskDto } from './home.actions'

export {
  createCheckIn,
  updateCheckIn,
  undoCheckIn,
  getMonthCheckIns,
  type CheckinResult,
  type UndoCheckinResult,
  type MonthCheckInRow,
} from './checkin.actions'

export {
  getWeeklyStats,
  getCurrentWeekStart,
  type WeeklyStats,
  type DailyBreakdown,
  type AreaBreakdown,
} from './stats.actions'

export {
  completeOnboarding,
  checkOnboardingStatus,
  type DirectionInput,
  type AreaInput,
  type GoalInput,
  type OnboardingResult,
} from './onboarding.actions'

// Phase 4.5: New Server Actions
export { getDirection, createDirection, updateDirection } from './direction.actions'

// Roadmap Versioning
export {
  createNewRoadmapVersion,
  getDirectionHistory,
  getArchivedRoadmap,
} from './roadmap-version.actions'

export {
  getAreas,
  getActiveAreas,
  createArea,
  updateArea,
  deleteArea,
  reorderAreas,
} from './area.actions'

export {
  getGoals,
  getGoalsByStatus,
  getGoalsByArea,
  getGoalDetail,
  createGoal,
  updateGoal,
  updateGoalStatus,
  deleteGoal,
} from './goal.actions'

export {
  getGroupsByGoal,
  createGroup,
  updateGroup,
  toggleGroupComplete,
  deleteGroup,
  reorderGroups,
  enableGoalGroups,
  disableGoalGroups,
} from './group.actions'

export {
  getTasks,
  getTodayTasks as getTasksToday,
  getTasksByGoal,
  createTask,
  updateTask,
  reorderTasks,
  deleteTask,
} from './task.actions'

export {
  getDailyReflection,
  getReflectionsByDateRange,
  createReflection,
  updateReflection,
  deleteReflection,
} from './reflection.actions'

export { getMonthlyReflection, saveMonthlyReflection } from './monthly-reflection.actions'

export { getWeeklyReflection, saveWeeklyReflection } from './weekly-reflection.actions'

export {
  getGoalReflection,
  getGoalReflections,
  saveGoalReflection,
} from './goal-reflection.actions'

export { getProfile, updateProfile, updateAvatar, isOnboardingCompleted } from './profile.actions'

export {
  getAllMessages,
  getUnreadMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from './ai-message.actions'

// Phase 4.75: Auth Actions
export {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithMagicLink,
  resetPassword,
  signOut,
} from './auth.actions'

// Phase 7: Tree Reordering
export { moveNode, type MoveNodeInput, type MoveNodeResult, type NodeType } from './tree.actions'

// Chat (AI Coach)
export {
  getChatConversations,
  getChatMessages,
  createChatConversation,
  saveChatMessage,
  deleteChatConversation,
} from './chat.actions'

// Admin
export {
  getAdminStats,
  getAdminSignupChart,
  getAdminUsers,
  getAdminUserDetail,
  toggleAdminStatus,
} from './admin.actions'

// Announcements
export {
  getActiveAnnouncements,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from './announcement.actions'

// Feedbacks
export {
  submitFeedback,
  getMyFeedbacks,
  getAdminFeedbacks,
  updateFeedbackStatus,
} from './feedback.actions'

// Status History
export {
  getGoalStatusHistory,
  getTaskStatusHistory,
  getObstacleAnalysis,
} from './status-history.actions'
