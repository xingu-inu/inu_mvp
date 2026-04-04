import type { TraitCategory } from '@/types/entities'

export interface TraitPreset {
  label: string
  values?: string[]
}

export const TRAIT_PRESETS: Record<TraitCategory, TraitPreset[]> = {
  identity: [
    {
      label: 'MBTI',
      values: [
        'INTJ',
        'INTP',
        'ENTJ',
        'ENTP',
        'INFJ',
        'INFP',
        'ENFJ',
        'ENFP',
        'ISTJ',
        'ISFJ',
        'ESTJ',
        'ESFJ',
        'ISTP',
        'ISFP',
        'ESTP',
        'ESFP',
      ],
    },
    { label: '에니어그램' },
    { label: '성격 유형' },
    { label: '기질' },
  ],
  stats: [
    { label: '강점' },
    { label: '약점' },
    { label: '핵심 역량' },
    { label: '자신감 있는 분야' },
  ],
  interests: [
    { label: '요즘 관심사' },
    { label: '취미' },
    { label: '배우고 싶은 것' },
    { label: '읽고 있는 책' },
  ],
  description: [
    { label: '올해의 테마' },
    { label: '인생 모토' },
    { label: '가치관' },
    { label: '나를 한 마디로' },
  ],
  habits: [
    { label: '아침 루틴' },
    { label: '에너지 충전법' },
    { label: '피하고 싶은 패턴' },
    { label: '수면 패턴' },
  ],
  general: [],
}
