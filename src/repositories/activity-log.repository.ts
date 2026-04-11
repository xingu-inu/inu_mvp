// Activity Log Repository
// 로드맵 CRUD 이벤트(생성/rename/why수정/이동/삭제) 기록
// 상태 전환은 goal_status_history/task_status_history가 담당하므로 여기서는 제외.

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import { secureLog } from '@/lib/security'

export type ActivityEntityType = 'area' | 'goal' | 'group' | 'task'
export type ActivityActionType = 'created' | 'renamed' | 'why_updated' | 'moved' | 'deleted'

export interface ActivityLogRow {
  id: string
  user_id: string
  entity_type: ActivityEntityType
  entity_id: string
  action: ActivityActionType
  entity_name: string | null
  area_id: string | null
  goal_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LogActivityParams {
  entityType: ActivityEntityType
  entityId: string
  action: ActivityActionType
  entityName?: string | null
  areaId?: string | null
  goalId?: string | null
  metadata?: Record<string, unknown>
}

export const activityLogRepository = {
  /**
   * 활동 로그 insert.
   *
   * 실패해도 호출자는 throw하지 않고 console.error만 남기는 "best-effort" 패턴.
   * 사용자의 핵심 mutation이 활동 로그 insert 실패 때문에 깨지면 안 되기 때문.
   */
  async log(
    supabase: TypedSupabaseClient,
    userId: string,
    params: LogActivityParams
  ): Promise<void> {
    try {
      const { error } = await supabase.from('activity_log').insert({
        user_id: userId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        entity_name: params.entityName ?? null,
        area_id: params.areaId ?? null,
        goal_id: params.goalId ?? null,
        metadata: (params.metadata ?? {}) as never,
      })

      if (error) {
        secureLog.error('[activity_log] insert failed', error)
      }
    } catch (err) {
      secureLog.error('[activity_log] insert threw', err)
    }
  },

  /**
   * 전체 활동 로그 조회 (타임라인용).
   * timestamp 기반 sort는 호출자에서 다른 소스와 머지 후 수행.
   */
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<ActivityLogRow[]> {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as ActivityLogRow[]
  },
}
