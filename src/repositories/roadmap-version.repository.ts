// Roadmap Version Repository

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type {
  CreateRoadmapVersionInput,
  RoadmapVersionResult,
  DirectionHistoryItem,
  ArchivedRoadmapData,
  DeleteArchivedRoadmapResult,
} from '@/types/entities'

// RPC 함수들이 아직 DB 타입에 없으므로 untyped rpc 호출 사용
// DB 타입 재생성 후 제거 가능

type UntypedRpc = (
  fn: string,
  params: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>

export const roadmapVersionRepository = {
  /**
   * 새 로드맵 버전 생성 (재정비)
   */
  async createNewVersion(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateRoadmapVersionInput
  ): Promise<RoadmapVersionResult> {
    const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc
    const { data, error } = await rpc('create_new_roadmap_version', {
      p_user_id: userId,
      p_statement: input.statement,
      p_why: input.why ?? null,
      p_name: input.name ?? null,
      p_carry_over_goal_ids: input.carryOverGoalIds,
    })

    if (error) handleSupabaseError(error)
    return data as RoadmapVersionResult
  },

  /**
   * 로드맵 히스토리 조회
   */
  async getHistory(supabase: TypedSupabaseClient, userId: string): Promise<DirectionHistoryItem[]> {
    const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc
    const { data, error } = await rpc('get_direction_history', {
      p_user_id: userId,
    })

    if (error) handleSupabaseError(error)
    return (data ?? []) as DirectionHistoryItem[]
  },

  /**
   * 아카이브된 로드맵 상세 조회
   */
  async getArchivedRoadmap(
    supabase: TypedSupabaseClient,
    userId: string,
    directionId: string
  ): Promise<ArchivedRoadmapData> {
    const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc
    const { data, error } = await rpc('get_archived_roadmap', {
      p_user_id: userId,
      p_direction_id: directionId,
    })

    if (error) handleSupabaseError(error)
    return data as ArchivedRoadmapData
  },

  /**
   * 아카이브된 로드맵 삭제
   */
  async deleteArchivedRoadmap(
    supabase: TypedSupabaseClient,
    userId: string,
    directionId: string
  ): Promise<DeleteArchivedRoadmapResult> {
    const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc
    const { data, error } = await rpc('delete_archived_roadmap', {
      p_user_id: userId,
      p_direction_id: directionId,
    })

    if (error) handleSupabaseError(error)
    return data as DeleteArchivedRoadmapResult
  },
}
