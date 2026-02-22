import { z } from 'zod'

// ============================================
// Common Schemas
// ============================================
export const uuidSchema = z.string().uuid()

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)')
  .transform((val) => val.slice(0, 5))

// ============================================
// Direction Schemas
// ============================================
export const createDirectionSchema = z.object({
  statement: z.string().min(1, 'Required').max(500, 'Max 500 characters'),
  why: z.string().max(1000).optional(),
})

export const updateDirectionSchema = z.object({
  statement: z.string().min(1).max(500).optional(),
  why: z.string().max(1000).optional(),
})

export type CreateDirectionSchema = z.infer<typeof createDirectionSchema>
export type UpdateDirectionSchema = z.infer<typeof updateDirectionSchema>

// ============================================
// Area Schemas
// ============================================
export const areaTypeSchema = z.enum([
  'health',
  'career',
  'finance',
  'relationships',
  'hobbies',
  'mental',
  'learning',
  'daily',
  'custom',
])

export const createAreaSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(50, 'Max 50 characters'),
  type: areaTypeSchema.optional().default('custom'),
  emoji: z.string().min(1).max(4),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  why: z.string().trim().max(500).optional(),
})

export const updateAreaSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  type: areaTypeSchema.optional(),
  emoji: z.string().min(1).max(4).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  why: z.string().trim().max(500).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.string().optional(),
})

export type CreateAreaSchema = z.infer<typeof createAreaSchema>
export type UpdateAreaSchema = z.infer<typeof updateAreaSchema>

// ============================================
// Goal Schemas
// ============================================
export const goalStatusSchema = z.enum([
  'active',
  'backlog',
  'completed',
  'maintenance',
  'paused',
  'archived',
])

export const createGoalSchema = z.object({
  area_id: z.string().uuid('영역을 선택해주세요'),
  name: z.string().trim().min(1, 'Required').max(100, 'Max 100 characters'),
  why: z.string().trim().max(500).optional(),
  status: goalStatusSchema.optional().default('active'),
  target_date: dateSchema.optional(),
})

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  why: z.string().trim().max(500).optional(),
  status: goalStatusSchema.optional(),
  target_date: dateSchema.optional(),
  sort_order: z.string().optional(),
})

export type CreateGoalSchema = z.infer<typeof createGoalSchema>
export type UpdateGoalSchema = z.infer<typeof updateGoalSchema>

// ============================================
// Group Schemas
// ============================================
export const createGroupSchema = z.object({
  goal_id: uuidSchema,
  name: z.string().trim().min(1, 'Required').max(100, 'Max 100 characters'),
  why: z.string().trim().max(300).optional(),
  description: z.string().trim().max(500).optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  why: z.string().trim().max(300).optional(),
  description: z.string().trim().max(500).optional(),
  is_completed: z.boolean().optional(),
  sort_order: z.string().optional(),
})

export type CreateGroupSchema = z.infer<typeof createGroupSchema>
export type UpdateGroupSchema = z.infer<typeof updateGroupSchema>

export const taskStatusSchema = z.enum(['active', 'completed', 'paused'])

// ============================================
// Task Schemas
// ============================================
export const repeatTypeSchema = z.enum([
  'once',
  'daily',
  'weekdays',
  'weekends',
  'weekly',
  'custom',
])

export const timeSlotSchema = z.enum(['dawn', 'morning', 'afternoon', 'evening', 'anytime'])

export const createTaskSchema = z
  .object({
    goal_id: uuidSchema.optional(),
    group_id: uuidSchema.optional(),
    area_id: uuidSchema.optional(),
    name: z.string().trim().min(1, 'Required').max(100, 'Max 100 characters'),
    why: z.string().trim().max(500).optional(),
    repeat_type: repeatTypeSchema.optional().default('once'),
    repeat_days: z.array(z.number().int().min(0).max(6)).optional(),
    duration_minutes: z.number().int().min(1).max(480).optional().default(15),
    time_slot: timeSlotSchema.optional().default('anytime'),
    specific_time: timeSchema.optional(),
    related_area_ids: z.array(z.string().uuid()).optional(),
    related_goal_ids: z.array(z.string().uuid()).optional(),
    scheduled_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
      .optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
      .optional(),
  })
  .refine((data) => data.repeat_type !== 'once' || data.scheduled_date, {
    message: '1회 할일은 날짜를 선택해주세요',
    path: ['scheduled_date'],
  })
  .refine(
    (data) => data.repeat_type !== 'custom' || (data.repeat_days && data.repeat_days.length > 0),
    {
      message: '요일을 하나 이상 선택해주세요',
      path: ['repeat_days'],
    }
  )

export const updateTaskSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  why: z.string().trim().max(500).optional(),
  group_id: uuidSchema.nullable().optional(),
  repeat_type: repeatTypeSchema.optional(),
  repeat_days: z.array(z.number().int().min(0).max(6)).optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  time_slot: timeSlotSchema.optional(),
  specific_time: timeSchema.optional(),
  is_active: z.boolean().optional(),
  status: taskStatusSchema.optional(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .nullable()
    .optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional()
    .nullable(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional()
    .nullable(),
  status_change_reason: z.string().max(100).optional(),
  status_change_note: z.string().max(500).optional(),
  sort_order: z.string().optional(),
  related_area_ids: z.array(z.string().uuid()).optional(),
  related_goal_ids: z.array(z.string().uuid()).optional(),
  cross_link_group_map: z.record(z.string().uuid(), z.string().uuid().nullable()).optional(),
})

export type CreateTaskSchema = z.infer<typeof createTaskSchema>
export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>

// ============================================
// Check-in Schemas
// ============================================
export const checkinStatusSchema = z.enum(['done', 'skip', 'miss'])

export const createCheckInSchema = z.object({
  task_id: uuidSchema,
  date: dateSchema,
  status: checkinStatusSchema,
  note: z.string().max(500).optional(),
})

export type CreateCheckInSchema = z.infer<typeof createCheckInSchema>

// ============================================
// Reflection Schemas
// ============================================
export const moodLevelSchema = z.enum(['terrible', 'bad', 'neutral', 'good', 'great'])

export const createReflectionSchema = z.object({
  date: dateSchema,
  mood: moodLevelSchema.optional(),
  summary: z.string().max(1000).optional(),
})

export const updateReflectionSchema = z.object({
  mood: moodLevelSchema.optional(),
  summary: z.string().max(1000).optional(),
})

export type CreateReflectionSchema = z.infer<typeof createReflectionSchema>
export type UpdateReflectionSchema = z.infer<typeof updateReflectionSchema>

// ============================================
// Monthly Reflection Schemas
// ============================================
export const monthlyReflectionSchema = z.object({
  month_start: dateSchema,
  summary: z.string().max(200).optional(),
  highlight: z.string().max(200).optional(),
  challenge: z.string().max(200).optional(),
})

export type MonthlyReflectionSchema = z.infer<typeof monthlyReflectionSchema>

// ============================================
// Goal Reflection Schemas
// ============================================
export const goalReflectionSchema = z.object({
  goal_id: uuidSchema,
  period_start: dateSchema,
  period_end: dateSchema,
  summary: z.string().max(2000).optional(),
  progress_feeling: z.enum(['terrible', 'bad', 'neutral', 'good', 'great']).optional(),
  next_focus: z.string().max(1000).optional(),
})

export type GoalReflectionSchema = z.infer<typeof goalReflectionSchema>

// ============================================
// Weekly Reflection Schemas
// ============================================
export const weeklyReflectionSchema = z.object({
  week_start: dateSchema,
  highlight: z.string().max(500).optional(),
  challenge: z.string().max(500).optional(),
  next_focus: z.string().max(500).optional(),
})

export type WeeklyReflectionSchema = z.infer<typeof weeklyReflectionSchema>

// ============================================
// Profile Schemas
// ============================================
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  ai_model: z.enum(['gemini-2.5-flash', 'gpt-4.1', 'gpt-5.1']).optional(),
})

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>

// ============================================
// Auth Schemas
// ============================================
export const loginSchema = z.object({
  email: z.string().max(254).email('올바른 이메일 형식을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

/**
 * Password strength: min 8 chars + at least 2 of 3 categories
 * (letter, number, special character)
 */
const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .max(128, '비밀번호는 128자 이하여야 합니다')
  .refine(
    (pw) => {
      const hasLetter = /[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]/.test(pw)
      const hasNumber = /\d/.test(pw)
      const hasSpecial = /[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣\s]/.test(pw)
      return [hasLetter, hasNumber, hasSpecial].filter(Boolean).length >= 2
    },
    { message: '영문, 숫자, 특수문자 중 2종류 이상 포함해주세요' }
  )

export const signupSchema = z
  .object({
    email: z.string().max(254).email('올바른 이메일 형식을 입력해주세요'),
    password: passwordSchema,
    confirmPassword: z.string(),
    agreeToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })
  .refine((data) => data.agreeToTerms === true, {
    message: '이용약관에 동의해주세요',
    path: ['agreeToTerms'],
  })

export const magicLinkSchema = z.object({
  email: z.string().max(254).email('올바른 이메일 형식을 입력해주세요'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().max(254).email('올바른 이메일 형식을 입력해주세요'),
})

export type LoginSchema = z.infer<typeof loginSchema>
export type SignupSchema = z.infer<typeof signupSchema>
export type MagicLinkSchema = z.infer<typeof magicLinkSchema>
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

// ============================================
// Onboarding Schemas
// ============================================
export const onboardingValuesSchema = z.object({
  lifestyles: z.array(z.string()).min(1, '최소 1개 이상 선택해주세요'),
  values: z
    .array(z.string())
    .min(1, '최소 1개 이상 선택해주세요')
    .max(3, '최대 3개까지 선택 가능해요'),
})

export const onboardingDirectionSchema = z.object({
  statement: z
    .string()
    .min(10, '조금 더 구체적으로 작성해주세요')
    .max(500, '500자 이내로 작성해주세요'),
})

export const onboardingGoalSchema = z.object({
  name: z.string().min(1, '목표를 입력해주세요').max(100, '100자 이내로 작성해주세요'),
  why: z.string().max(500).optional(),
})

export type OnboardingValuesSchema = z.infer<typeof onboardingValuesSchema>
export type OnboardingDirectionSchema = z.infer<typeof onboardingDirectionSchema>
export type OnboardingGoalSchema = z.infer<typeof onboardingGoalSchema>

// ============================================
// Onboarding V2 Schemas
// ============================================
export const onboardingAreasSchema = z
  .array(
    z.object({
      name: z.string(),
      type: z.string(),
      emoji: z.string(),
      color: z.string(),
    })
  )
  .min(1, '최소 1개 영역을 선택해주세요')

export const onboardingTaskSchema = z.object({
  name: z.string().min(1, '실천을 입력해주세요').max(100, '100자 이내로 작성해주세요'),
})

export type OnboardingAreasSchema = z.infer<typeof onboardingAreasSchema>
export type OnboardingTaskSchema = z.infer<typeof onboardingTaskSchema>
