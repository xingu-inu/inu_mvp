// Announcement Repository
// Announcements data access

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'update' | 'event'
  is_active: boolean
  created_by: string | null
  created_at: string
  expires_at: string | null
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  type: 'info' | 'update' | 'event'
  expires_at?: string | null
  created_by: string
}

export interface UpdateAnnouncementInput {
  title?: string
  content?: string
  type?: 'info' | 'update' | 'event'
  is_active?: boolean
  expires_at?: string | null
}

// Note: Table 'announcements' not yet in generated database.ts — cast required until `db:types` is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrom = any

export const announcementRepository = {
  /**
   * 활성 공지사항 조회 (사용자용)
   * - is_active = true
   * - expires_at이 null이거나 현재 시각 이후
   */
  async getActive(supabase: TypedSupabaseClient): Promise<Announcement[]> {
    const { data, error } = await (supabase.from as AnyFrom)('announcements')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Announcement[]
  },

  /**
   * 전체 공지사항 목록 조회 (관리자용)
   */
  async list(
    supabase: TypedSupabaseClient,
    params: { isActive?: boolean }
  ): Promise<Announcement[]> {
    let query = (supabase.from as AnyFrom)('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive)
    }

    const { data, error } = await query
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Announcement[]
  },

  /**
   * 공지사항 생성 (관리자용)
   */
  async create(
    supabase: TypedSupabaseClient,
    input: CreateAnnouncementInput
  ): Promise<Announcement> {
    const { data, error } = await (supabase.from as AnyFrom)('announcements')
      .insert({
        title: input.title,
        content: input.content,
        type: input.type,
        expires_at: input.expires_at ?? null,
        created_by: input.created_by,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as Announcement
  },

  /**
   * 공지사항 수정 (관리자용)
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateAnnouncementInput
  ): Promise<Announcement> {
    const { data, error } = await (supabase.from as AnyFrom)('announcements')
      .update(input as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as Announcement
  },

  /**
   * 공지사항 삭제 (관리자용)
   */
  async remove(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await (supabase.from as AnyFrom)('announcements').delete().eq('id', id)
    if (error) handleSupabaseError(error)
  },
}
