// Admin Repository
// Admin dashboard data access

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'

export interface AdminStats {
  totalUsers: number
  todaySignups: number
  weekSignups: number
  monthSignups: number
  onboardedUsers: number
  todayActiveUsers: number
  weekActiveUsers: number
  monthActiveUsers: number
  totalGoals: number
  totalTasks: number
  todayCheckIns: number
  totalFeedbacks: number
}

export interface SignupChartRow {
  date: string
  count: number
}

export interface AdminUserRow {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  is_admin: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  // Computed (filled in getUserDetail)
  goalCount?: number
  taskCount?: number
  checkInCount?: number
  lastActive?: string | null
}

export const adminRepository = {
  /**
   * 관리자 대시보드 통계 조회 (RPC)
   * Note: RPC not yet in generated database.ts — cast required until `db:types` is run
   */
  async getStats(supabase: TypedSupabaseClient): Promise<AdminStats> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_admin_stats')
    if (error) handleSupabaseError(error)
    return data as unknown as AdminStats
  },

  /**
   * 가입자 차트 데이터 조회 (RPC)
   * Note: RPC not yet in generated database.ts — cast required until `db:types` is run
   */
  async getSignupChart(
    supabase: TypedSupabaseClient,
    days: number = 30
  ): Promise<SignupChartRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_admin_signup_chart', { p_days: days })
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as SignupChartRow[]
  },

  /**
   * 사용자 목록 조회 (페이지네이션 + 검색)
   */
  async listUsers(
    supabase: TypedSupabaseClient,
    params: { search?: string; page?: number; pageSize?: number }
  ): Promise<{ users: AdminUserRow[]; total: number }> {
    const { search, page = 1, pageSize = 20 } = params
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (search) {
      // Whitelist-based sanitization: only allow safe characters for PostgREST filter
      const sanitized = search.replace(/[^a-zA-Z0-9@_\-\s\u3131-\uD79D]/g, '').trim()
      if (sanitized) {
        query = query.or(`email.ilike.%${sanitized}%,name.ilike.%${sanitized}%`)
      }
    }

    const { data, error, count } = await query
    if (error) handleSupabaseError(error)

    return { users: (data ?? []) as unknown as AdminUserRow[], total: count ?? 0 }
  },

  /**
   * 사용자 상세 조회 (프로필 + 통계)
   */
  async getUserDetail(supabase: TypedSupabaseClient, userId: string): Promise<AdminUserRow | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) handleSupabaseError(error)

    const [goalsRes, tasksRes, checkInsRes, lastActiveRes] = await Promise.all([
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('check_ins').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('check_ins')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1),
    ])

    return {
      ...(profile as unknown as AdminUserRow),
      goalCount: goalsRes.count ?? 0,
      taskCount: tasksRes.count ?? 0,
      checkInCount: checkInsRes.count ?? 0,
      lastActive: lastActiveRes.data?.[0]?.date ?? null,
    }
  },

  /**
   * 관리자 권한 설정
   */
  async setAdminStatus(
    supabase: TypedSupabaseClient,
    userId: string,
    isAdmin: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin } as Record<string, unknown>)
      .eq('id', userId)
    if (error) handleSupabaseError(error)
  },
}
