export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// 레이아웃 전환점
// < lg: BottomNav (mobile)
// >= lg: Sidebar (desktop)
export const LAYOUT_BREAKPOINT = BREAKPOINTS.lg // 1024px
