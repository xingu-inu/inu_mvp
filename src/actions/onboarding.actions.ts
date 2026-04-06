'use server'

import { generateKeyBetween } from 'fractional-indexing'
import { authAction } from '@/lib/security'
import { successResponse } from '@/lib/api'
import type { AreaType } from '@/types/entities'

interface CompleteOnboardingInput {
  direction: {
    statement: string
    why: string
  }
  area: {
    name: string
    type: AreaType
    emoji: string
    color: string
    why: string
  }
}

/**
 * 온보딩 완료 — Direction + Area 생성 + onboarding_completed 플래그 (멱등성 보장)
 */
export const completeOnboarding = authAction(
  'completeOnboarding',
  async ({ supabase, user }, input: CompleteOnboardingInput) => {
    // 1. 기존 active direction이 있으면 skip (멱등성)
    const { data: existingDirection } = await supabase
      .from('directions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    let directionId = existingDirection?.id

    if (!directionId) {
      // 2. Direction 생성
      const { data: newDirection, error: dirError } = await supabase
        .from('directions')
        .insert({
          user_id: user.id,
          statement: input.direction.statement,
          why: input.direction.why,
          status: 'active',
          version: 1,
        })
        .select('id')
        .single()

      if (dirError) throw dirError
      directionId = newDirection.id
    }

    // 3. Area 생성 (같은 타입이 없을 때만)
    const { data: existingArea } = await supabase
      .from('areas')
      .select('id')
      .eq('user_id', user.id)
      .eq('direction_id', directionId)
      .eq('type', input.area.type)
      .maybeSingle()

    if (!existingArea) {
      // sort_order: 기존 마지막 area 뒤에 배치
      const { data: lastArea } = await supabase
        .from('areas')
        .select('sort_order')
        .eq('direction_id', directionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sortOrder = generateKeyBetween(lastArea?.sort_order ?? null, null)

      const { error: areaError } = await supabase.from('areas').insert({
        user_id: user.id,
        direction_id: directionId,
        name: input.area.name,
        type: input.area.type,
        emoji: input.area.emoji,
        color: input.area.color,
        why: input.area.why,
        sort_order: sortOrder,
        is_active: true,
      })

      if (areaError) throw areaError
    }

    // 4. 온보딩 완료 표시
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    if (profileError) throw profileError

    return successResponse(null)
  }
)
