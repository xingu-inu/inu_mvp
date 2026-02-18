/**
 * Zod validation helper — eliminates repeated safeParse + error mapping boilerplate
 */

import type { ZodSchema } from 'zod'
import { validationErrorResponse } from '@/lib/api'
import type { ApiErrorResponse } from '@/types/api'

type ValidationOk<T> = { success: true; data: T }
type ValidationFail = { success: false; response: ApiErrorResponse }
type ValidationResult<T> = ValidationOk<T> | ValidationFail

export function validate<T>(schema: ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      response: validationErrorResponse(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      ),
    }
  }
  return { success: true, data: result.data }
}
