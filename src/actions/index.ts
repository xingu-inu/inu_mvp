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

export { getProfile, updateProfile, updateAvatar, isOnboardingCompleted } from './profile.actions'

export {
  getProfileTraits,
  createProfileTrait,
  updateProfileTrait,
  deleteProfileTrait,
  reorderProfileTraits,
} from './profile-trait.actions'

export {
  getAiInsights,
  createAiInsight,
  updateAiInsight,
  deleteAiInsight,
} from './ai-insight.actions'

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
