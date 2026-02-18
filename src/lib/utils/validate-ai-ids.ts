import type { Goal, Area } from '@/types/entities'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * AI 응답의 goalId/areaId를 캐시 데이터와 대조 검증.
 * 유효하지 않은 ID는 undefined로 반환하여 서버 검증을 통과시킨다.
 */
export function validateAiIds(
  input: { goalId?: string | null; areaId?: string | null },
  cachedGoals: Goal[],
  cachedAreas: Area[]
): { goalId: string | undefined; areaId: string | undefined } {
  let goalId: string | undefined
  let areaId: string | undefined

  if (input.goalId && UUID_REGEX.test(input.goalId)) {
    const exists = cachedGoals.some((g) => g.id === input.goalId)
    if (exists) goalId = input.goalId
  }

  if (input.areaId && UUID_REGEX.test(input.areaId)) {
    const exists = cachedAreas.some((a) => a.id === input.areaId)
    if (exists) areaId = input.areaId
  }

  return { goalId, areaId }
}
