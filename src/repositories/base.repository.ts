// Base Repository
// Phase 4.5: API Design & Server Actions

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateNKeysBetween } from 'fractional-indexing'
import type { Database } from '@/types/database'
import { secureLog } from '@/lib/security'

/**
 * Typed Supabase Client
 */
export type TypedSupabaseClient = SupabaseClient<Database>

/**
 * Supabase 에러 처리
 * - 로그 출력 후 사용자 친화적 에러로 변환
 */
export function handleSupabaseError(error: unknown): never {
  secureLog.error('[Supabase Error]', error)

  // PostgrestError인 경우
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string; details?: string }

    // 특정 에러 코드에 대한 처리
    switch (pgError.code) {
      case 'PGRST116':
        // Row not found (단일 조회 시)
        throw new Error('NOT_FOUND')
      case '23505':
        // Unique violation
        throw new Error('ALREADY_EXISTS')
      case '23503':
        // Foreign key violation
        throw new Error('CONFLICT')
      default:
        throw new Error('DATABASE_ERROR')
    }
  }

  throw new Error('DATABASE_ERROR')
}

/**
 * "no rows" 에러인지 확인
 * - Supabase single() 호출 시 데이터가 없으면 발생
 */
export function isNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === 'PGRST116'
  }
  return false
}

/**
 * ISO 타임스탬프 생성
 */
export function now(): string {
  return new Date().toISOString()
}

/**
 * Active Direction ID 조회
 * - area/goal repo에서 중복 호출 방지를 위한 공통 헬퍼
 */
export async function getActiveDirectionId(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('directions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Fractional-indexing key 유효성 검증
 * - 숫자로 시작하는 레거시 키(예: "1", "2")를 감지
 */
export function isValidFractionalKey(key: string): boolean {
  return key.length > 0 && !/^\d/.test(key)
}

/**
 * Batch reorder — 단일 RPC 호출로 sort_order 일괄 업데이트
 * - 기존: for-loop으로 N개 UPDATE 쿼리 → 새: 단일 batch_update_sort_order RPC
 */
export async function batchReorder(
  supabase: TypedSupabaseClient,
  tableName: 'areas' | 'goals' | 'groups' | 'tasks',
  orderedIds: string[]
): Promise<void> {
  if (orderedIds.length === 0) return

  const keys = generateNKeysBetween(null, null, orderedIds.length)
  const updates = orderedIds.map((id, i) => ({ id, sortOrder: keys[i] }))

  const { error } = await supabase.rpc('batch_update_sort_order', {
    p_table_name: tableName,
    p_updates: updates,
  })
  if (error) handleSupabaseError(error)
}
