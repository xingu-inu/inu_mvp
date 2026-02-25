import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart2,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Heart,
  Leaf,
  Lightbulb,
  Link2,
  ListTodo,
  LayoutList,
  Pin,
  Scale,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Target,
  TreePine,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/** Curated Lucide icon map for AI responses. kebab-case key → component. */
export const AI_ICON_MAP: Record<string, LucideIcon> = {
  // Analysis & Data
  'bar-chart-2': BarChart2,
  'trending-up': TrendingUp,
  activity: Activity,

  // Goals & Progress
  target: Target,
  award: Award,
  star: Star,
  'check-circle-2': CheckCircle2,

  // Insights
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  brain: Brain,
  eye: Eye,

  // Priority (tier)
  flame: Flame,
  pin: Pin,

  // Growth stages (summary)
  sprout: Sprout,
  leaf: Leaf,
  'tree-pine': TreePine,

  // Diagnosis themes
  scale: Scale,
  'link-2': Link2,
  'list-todo': ListTodo,
  'layout-list': LayoutList,

  // Energy
  zap: Zap,
  'arrow-up-right': ArrowUpRight,

  // Misc
  calendar: Calendar,
  clock: Clock,
  heart: Heart,
  shield: Shield,
}

/** Get Lucide icon component by kebab-case name. Returns undefined if not found. */
export function getAiIcon(name: string): LucideIcon | undefined {
  return AI_ICON_MAP[name]
}

/** All available icon names (for AI prompt reference) */
export const AI_ICON_NAMES = Object.keys(AI_ICON_MAP)
