import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authRoute } from '@/lib/security'
import { generateContent } from '@/lib/ai/generate-client'
import { SYSTEM_PROMPT } from '@/lib/ai/constants'
import { buildPrompt } from '@/lib/ai/prompts'
import { detectInjectionPatterns } from '@/lib/ai/sanitize'
import { profileRepository } from '@/repositories/profile.repository'
import type { AiModelId } from '@/lib/ai/provider'
import type { AiGenerateRequest, AiGenerateResponse } from '@/lib/ai/types'

const contextSchema = z.object({
  direction: z.string().nullish(),
  areaName: z.string().nullish(),
  areaType: z.string().nullish(),
  areaWhy: z.string().nullish(),
  goalName: z.string().nullish(),
  goalWhy: z.string().nullish(),
  groupName: z.string().nullish(),
  groupDescription: z.string().nullish(),
  existingGoals: z.array(z.string()).optional(),
  existingGroups: z.array(z.string()).optional(),
  existingTasks: z.array(z.string()).optional(),
})

const brainDumpContextSchema = z.object({
  direction: z.string().nullish(),
  existingAreas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      emoji: z.string(),
      color: z.string(),
    })
  ),
  existingGoals: z.array(z.string()),
})

const diagnosisContextSchema = z.object({
  direction: z.string().nullable(),
  areas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      type: z.string(),
      why: z.string().nullable(),
    })
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      areaId: z.string(),
      name: z.string(),
      why: z.string().nullable(),
      status: z.string(),
      targetDate: z.string().nullable(),
      groupCount: z.number(),
      taskCount: z.number(),
    })
  ),
  tasks: z.array(
    z.object({
      id: z.string(),
      goalId: z.string(),
      name: z.string(),
      why: z.string().nullable(),
      repeatType: z.string(),
      timeSlot: z.string(),
      durationMinutes: z.number(),
      streakCount: z.number(),
    })
  ),
  stats: z.object({
    totalAreas: z.number(),
    totalGoals: z.number(),
    activeGoals: z.number(),
    backlogGoals: z.number(),
    totalTasks: z.number(),
    goalsWithoutWhy: z.number(),
    areasWithoutWhy: z.number(),
    tasksWithoutWhy: z.number(),
    goalsWithoutTasks: z.number(),
    avgTasksPerGoal: z.number(),
  }),
})

const taskSuggestContextSchema = z.object({
  direction: z.string().nullable(),
  areas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      type: z.string(),
      why: z.string().nullable(),
    })
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      areaId: z.string(),
      areaName: z.string(),
      areaEmoji: z.string(),
      status: z.string(),
      why: z.string().nullable(),
    })
  ),
  existingTasks: z.array(
    z.object({
      name: z.string(),
      goalId: z.string().nullable(),
    })
  ),
})

const priorityRankContextSchema = z.object({
  direction: z.string().nullable(),
  areas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      why: z.string().nullable(),
    })
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      areaId: z.string(),
      status: z.string(),
      why: z.string().nullable(),
      targetDate: z.string().nullable(),
      taskCount: z.number(),
    })
  ),
  allActiveTasks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      goalId: z.string().nullable(),
      goalName: z.string().nullable(),
      areaEmoji: z.string().nullable(),
      timeSlot: z.string(),
      durationMinutes: z.number(),
      repeatType: z.string(),
      streakCount: z.number(),
      why: z.string().nullable(),
    })
  ),
})

const reviewInsightContextSchema = z.object({
  period: z.enum(['week', 'month']),
  periodLabel: z.string(),
  completionRate: z.number(),
  activeDays: z.number(),
  totalDays: z.number(),
  avgMoodLabel: z.string(),
  moodTrend: z.array(z.object({ date: z.string(), mood: z.string() })),
  topStreaks: z.array(z.object({ taskName: z.string(), count: z.number(), areaName: z.string() })),
  areaBalances: z.array(z.object({ areaName: z.string(), completionRate: z.number() })),
  weeklyReflection: z
    .object({
      highlight: z.string().optional(),
      challenge: z.string().optional(),
      next_focus: z.string().optional(),
    })
    .optional(),
})

const aiRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('goal-brainstorm'),
    context: contextSchema,
  }),
  z.object({
    type: z.literal('decompose'),
    context: contextSchema,
    decomposeTarget: z.enum(['groups', 'tasks', 'both']),
  }),
  z.object({
    type: z.literal('why-vision'),
    context: contextSchema,
    target: z.enum(['area-why', 'goal-why', 'group-why', 'task-why', 'direction-why']),
  }),
  z.object({
    type: z.literal('review'),
    context: contextSchema,
  }),
  z.object({
    type: z.literal('brain-dump'),
    input: z.string().min(1).max(3000),
    context: brainDumpContextSchema,
  }),
  z.object({
    type: z.literal('roadmap-diagnosis'),
    scope: z.enum(['full', 'area', 'goal']),
    targetId: z.string().optional(),
    context: diagnosisContextSchema,
  }),
  z.object({
    type: z.literal('task-suggest'),
    context: taskSuggestContextSchema,
  }),
  z.object({
    type: z.literal('priority-rank'),
    context: priorityRankContextSchema,
  }),
  z.object({
    type: z.literal('review-insight'),
    context: reviewInsightContextSchema,
  }),
])

/**
 * Attempt to repair truncated JSON by closing unclosed brackets/braces.
 * Trims back to the last complete value, then closes remaining open structures.
 */
function repairTruncatedJson(text: string): string | null {
  // Trim trailing incomplete key/value (after last , or : outside a string)
  let trimmed = text
  // Remove trailing partial content after the last complete structure
  // Find the last } or ] or complete value ending (", number, true, false, null)
  const lastCloseIdx = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
  const lastCommaIdx = trimmed.lastIndexOf(',')
  const lastCompleteValue = Math.max(trimmed.lastIndexOf('"'), lastCloseIdx)

  if (lastCompleteValue < 0) return null

  // Cut after the last complete structure or value
  // If there's a comma after the last close bracket, cut at the comma
  if (lastCommaIdx > lastCloseIdx && lastCommaIdx > lastCompleteValue) {
    trimmed = trimmed.slice(0, lastCommaIdx)
  } else if (lastCloseIdx >= 0) {
    trimmed = trimmed.slice(0, lastCloseIdx + 1)
  } else {
    trimmed = trimmed.slice(0, lastCompleteValue + 1)
  }

  // Count unclosed brackets using a stack (skip inside strings)
  const stack: string[] = []
  let inString = false
  let escape = false
  for (const ch of trimmed) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    if (ch === '}' || ch === ']') stack.pop()
  }

  // Close remaining open structures in reverse order
  const closers = stack
    .reverse()
    .map((ch) => (ch === '{' ? '}' : ']'))
    .join('')

  return trimmed + closers
}

function parseJsonResponse(raw: string): AiGenerateResponse {
  // Strategy 1: Direct parse (handles clean JSON from responseMimeType)
  try {
    return JSON.parse(raw)
  } catch {
    // Continue to fallback strategies
  }

  // Clean: strip BOM + trim
  const cleaned = raw.replace(/^\uFEFF/, '').trim()

  // Strategy 2: Try cleaned version
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue
  }

  // Strategy 3: Extract from markdown code block
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // Code block content was not valid JSON, continue
    }
  }

  // Strategy 4: Find first { ... } in the text (greedy to capture full object)
  const jsonObjectMatch = cleaned.match(/(\{[\s\S]*\})/)
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[1])
    } catch {
      // Continue
    }
  }

  // Strategy 5: Repair truncated JSON (e.g. from MAX_TOKENS cutoff)
  if (cleaned.startsWith('{')) {
    try {
      const repaired = repairTruncatedJson(cleaned)
      if (repaired) {
        console.warn('[ai] Repaired truncated JSON. Original length:', cleaned.length)
        return JSON.parse(repaired)
      }
    } catch {
      // Continue
    }
  }

  // All strategies failed — log length only (no raw content in production)
  console.error('[ai] Failed to parse response. Raw length:', raw.length)

  throw new Error('Failed to parse AI response as JSON')
}

export const POST = authRoute(
  'ai.generate',
  async (ctx): Promise<NextResponse> => {
    try {
      // Parse and validate
      let body: unknown
      try {
        body = await ctx.request.json()
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INVALID_BODY', message: '요청 데이터를 읽지 못했어요.' },
          },
          { status: 400 }
        )
      }
      const parsed = aiRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.' },
          },
          { status: 400 }
        )
      }

      // Sanitize user inputs before prompt construction
      const aiRequest = parsed.data as AiGenerateRequest

      // Log potential injection attempts (monitoring only, not blocking)
      const textsToCheck: string[] = []
      if ('input' in aiRequest && typeof aiRequest.input === 'string') {
        textsToCheck.push(aiRequest.input)
      }
      if ('context' in aiRequest && aiRequest.context) {
        const reqCtx = aiRequest.context as Record<string, unknown>
        for (const val of Object.values(reqCtx)) {
          if (typeof val === 'string') textsToCheck.push(val)
        }
      }
      for (const text of textsToCheck) {
        if (detectInjectionPatterns(text)) {
          console.warn('[ai-security] Injection pattern detected in /generate request')
          break
        }
      }

      // Get user's preferred model
      const profile = await profileRepository.get(ctx.supabase, ctx.user.id)
      const modelId = (profile?.ai_model as AiModelId) ?? undefined

      // Build prompt and generate
      const userPrompt = buildPrompt(aiRequest)
      const rawResponse = await generateContent(SYSTEM_PROMPT, userPrompt, modelId)

      // Parse response
      const aiResponse = parseJsonResponse(rawResponse)

      return NextResponse.json({ success: true, data: aiResponse })
    } catch (error) {
      console.error('AI generate error:', error)

      const message = error instanceof Error ? error.message : ''
      const code = message.includes('blocked')
        ? 'AI_RESPONSE_BLOCKED'
        : message.includes('parse')
          ? 'AI_PARSE_ERROR'
          : message.includes('empty')
            ? 'AI_EMPTY_RESPONSE'
            : 'AI_GENERATION_FAILED'

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message: 'AI 응답을 생성하지 못했어요. 잠시 후 다시 시도해주세요.',
          },
        },
        { status: 500 }
      )
    }
  },
  { csrf: true, rateLimit: { limit: 5 } }
)
