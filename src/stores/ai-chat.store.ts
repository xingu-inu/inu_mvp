import { create } from 'zustand'
import type { ChatContext } from '@/types/entities'

interface AiChatState {
  // Panel 열림/닫힘
  isOpen: boolean
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void

  // 사이드바 (대화 목록) 열림/닫힘
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // 활성 대화
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void

  // AI 응답 로딩
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // 새 대화 시작
  startNewConversation: () => void

  // 컨텍스트 (Goal/Task에서 진입 시)
  context: ChatContext | null
  openChatWithContext: (context: ChatContext) => void
  clearContext: () => void
}

export const useAiChatStore = create<AiChatState>((set) => ({
  isOpen: false,
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),

  isSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id, context: null }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  startNewConversation: () => set({ activeConversationId: null, context: null }),

  context: null,
  openChatWithContext: (context) =>
    set({ context, isOpen: true, activeConversationId: null }),
  clearContext: () => set({ context: null }),
}))
