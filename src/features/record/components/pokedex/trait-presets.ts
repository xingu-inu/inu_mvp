export interface TraitPreset {
  label: string
  values?: string[]
}

export const TRAIT_PRESETS: TraitPreset[] = [
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
  { label: '혈액형', values: ['A', 'B', 'O', 'AB'] },
  { label: '직업' },
  { label: '강점' },
  { label: '취미' },
  { label: '요즘 관심사' },
  { label: '올해의 테마' },
  { label: '가치관' },
  { label: '에너지 충전법' },
  { label: '나를 한 마디로' },
]
