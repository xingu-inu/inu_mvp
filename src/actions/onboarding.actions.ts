'use server'

import { generateKeyBetween } from 'fractional-indexing'
import { authAction } from '@/lib/security'
import { successResponse } from '@/lib/api'
import type { AreaType } from '@/types/entities'
import {
  INTEREST_CHIPS,
  AREA_PRESETS_EXTENDED,
  DEFAULT_AREA_COLOR,
  composeDirectionFromValues,
} from '@/lib/constants/onboarding'

interface CompleteOnboardingInput {
  identityTraits: { label: string; value: string }[]
  values: string[]
  interests: string[]
}

/**
 * 온보딩 완료 — profile_traits 저장 + Direction + Area(복수) 생성 + onboarding_completed (멱등성 보장)
 */
export const completeOnboarding = authAction(
  'completeOnboarding',
  async ({ supabase, user }, input: CompleteOnboardingInput) => {
    // 1. profile_traits 배치 저장 (identity 카테고리 — 기존 identity trait이 없을 때만)
    if (input.identityTraits.length > 0) {
      const { count } = await supabase
        .from('profile_traits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('category', 'identity')
        .is('deleted_at', null)

      if (!count || count === 0) {
        let lastKey: string | null = null

        const { data: lastTrait } = await supabase
          .from('profile_traits')
          .select('sort_order')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()

        lastKey = lastTrait?.sort_order ?? null

        const traitRows = input.identityTraits.map((trait) => {
          const sortOrder = generateKeyBetween(lastKey, null)
          lastKey = sortOrder
          return {
            user_id: user.id,
            label: trait.label,
            value: trait.value,
            category: 'identity' as const,
            sort_order: sortOrder,
          }
        })

        const { error: traitError } = await supabase.from('profile_traits').insert(traitRows)
        if (traitError) throw traitError
      }
    }

    // 2. Direction 생성 (기존 active direction이 있으면 skip — 멱등성)
    const { data: existingDirection } = await supabase
      .from('directions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    let directionId = existingDirection?.id

    if (!directionId) {
      const statement = composeDirectionFromValues(input.values)
      const why = input.values.join(', ')

      const { data: newDirection, error: dirError } = await supabase
        .from('directions')
        .insert({
          user_id: user.id,
          statement,
          why,
          status: 'active',
          version: 1,
        })
        .select('id')
        .single()

      if (dirError) throw dirError
      directionId = newDirection.id
    }

    // 3. Area 복수 생성 (관심사별 고유 areaType만)
    if (input.interests.length > 0) {
      // 기존 area의 type 목록 조회
      const { data: existingAreas } = await supabase
        .from('areas')
        .select('type')
        .eq('user_id', user.id)
        .eq('direction_id', directionId)

      const existingTypes = new Set((existingAreas ?? []).map((a) => a.type))

      // 관심사 → 고유 areaType 추출 (중복 제거)
      const uniqueAreaTypes = new Map<AreaType, (typeof INTEREST_CHIPS)[number]>()
      for (const interestId of input.interests) {
        const chip = INTEREST_CHIPS.find((c) => c.id === interestId)
        if (chip && !existingTypes.has(chip.areaType) && !uniqueAreaTypes.has(chip.areaType)) {
          uniqueAreaTypes.set(chip.areaType, chip)
        }
      }

      // 마지막 sort_order 조회
      const { data: lastArea } = await supabase
        .from('areas')
        .select('sort_order')
        .eq('direction_id', directionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      let lastAreaKey: string | null = lastArea?.sort_order ?? null

      const areaRows = [...uniqueAreaTypes.entries()].map(([areaType, chip]) => {
        const preset = AREA_PRESETS_EXTENDED.find((a) => a.type === areaType)
        const sortOrder = generateKeyBetween(lastAreaKey, null)
        lastAreaKey = sortOrder
        return {
          user_id: user.id,
          direction_id: directionId,
          name: preset?.name ?? chip.label,
          type: areaType,
          emoji: preset?.emoji ?? chip.emoji,
          color: preset?.color ?? DEFAULT_AREA_COLOR,
          why: null,
          sort_order: sortOrder,
          is_active: true,
        }
      })

      if (areaRows.length > 0) {
        const { error: areaError } = await supabase.from('areas').insert(areaRows)
        if (areaError) throw areaError
      }
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
