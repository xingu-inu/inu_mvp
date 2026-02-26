import type { AreaType } from '@/types/entities'

// ============================================
// Default Area Options
// ============================================
export interface DefaultAreaOption {
  name: string
  type: AreaType
  emoji: string
  color: string
}

export const DEFAULT_AREAS: DefaultAreaOption[] = [
  { name: '건강', type: 'health', emoji: '💪', color: '#6b9e7d' },
  { name: '커리어', type: 'career', emoji: '📈', color: '#6978a8' },
  { name: '재정', type: 'finance', emoji: '💰', color: '#b89650' },
  { name: '관계', type: 'relationships', emoji: '❤️', color: '#c07878' },
  { name: '취미', type: 'hobbies', emoji: '🎨', color: '#5e9e9e' },
]

// ============================================
// Extended Area Presets (for inline area creation)
// ============================================
export const AREA_PRESETS_EXTENDED: DefaultAreaOption[] = [
  ...DEFAULT_AREAS,
  { name: '마음', type: 'mental', emoji: '🧘', color: '#9e7ec0' },
  { name: '학습', type: 'learning', emoji: '📚', color: '#5e82a8' },
  { name: '일상', type: 'daily', emoji: '☀️', color: '#8e8070' },
]

/** Default fallback color for areas (Indigo 500) */
export const DEFAULT_AREA_COLOR = '#8a7a65'

export const AREA_COLOR_PRESETS = [
  '#6b9e7d',
  '#6978a8',
  '#b89650',
  '#c07878',
  '#5e9e9e',
  '#9e7ec0',
  '#5e82a8',
  '#8e8070',
  '#a86868',
  '#6ea88e',
] as const

// ============================================
// Sample Goals by Area (Step 3)
// ============================================
export const SAMPLE_GOALS: Record<AreaType, string[]> = {
  health: ['매일 운동하기', '살 빼기', '일찍 자기', '건강 검진 받기'],
  career: ['이직 준비하기', '자격증 따기', '영어 공부하기', '사이드 프로젝트'],
  finance: ['월 저축 목표', '투자 공부', '지출 관리', '비상금 모으기'],
  relationships: ['가족과 시간 보내기', '친구 만나기', '연인과 데이트', '새로운 사람 만나기'],
  hobbies: ['책 읽기', '운동 배우기', '악기 연습', '그림 그리기'],
  mental: ['명상하기', '일기 쓰기', '감사 연습', '디지털 디톡스'],
  learning: ['새로운 기술 배우기', '온라인 강의 듣기', '독서 습관', '외국어 공부'],
  daily: ['아침 루틴', '정리정돈', '물 마시기', '스트레칭'],
  custom: [],
}

// ============================================
// Sample Area Why Reasons (Area Creation/Edit)
// ============================================
export const SAMPLE_AREA_WHYS: Record<AreaType, string[]> = {
  health: [
    '건강해야 모든 걸 할 수 있으니까',
    '오래 건강하게 살고 싶어서',
    '체력이 삶의 질을 결정하니까',
    '자신감의 기반이 되니까',
  ],
  career: [
    '경제적 자립의 기반이니까',
    '성장하는 느낌이 좋아서',
    '하고 싶은 일을 하며 살고 싶어서',
    '나만의 전문성을 키우고 싶어서',
  ],
  finance: [
    '경제적 자유가 선택의 자유니까',
    '미래의 나를 위한 준비니까',
    '돈 걱정 없이 살고 싶어서',
    '소중한 사람들을 지키고 싶어서',
  ],
  relationships: [
    '사람이 행복의 가장 큰 원천이니까',
    '혼자서는 할 수 없는 것들이 있으니까',
    '소중한 사람들과 깊이 연결되고 싶어서',
    '함께 성장하는 관계를 만들고 싶어서',
  ],
  hobbies: [
    '일만 하는 삶은 지속 가능하지 않으니까',
    '나만의 즐거움이 필요하니까',
    '새로운 나를 발견하는 시간이니까',
    '삶에 활력을 불어넣어 주니까',
  ],
  mental: [
    '마음이 건강해야 몸도 건강하니까',
    '감정을 잘 다루는 게 삶의 기술이니까',
    '번아웃 없이 오래 달리고 싶어서',
    '내 안의 평화가 모든 것의 시작이니까',
  ],
  learning: [
    '배움이 멈추면 성장도 멈추니까',
    '새로운 가능성을 열어주니까',
    '알아가는 과정 자체가 즐거우니까',
    '변화하는 세상에 적응하고 싶어서',
  ],
  daily: [
    '하루하루가 모여 인생이 되니까',
    '작은 습관이 큰 변화를 만드니까',
    '규칙적인 생활이 안정감을 주니까',
    '기본이 탄탄해야 다른 것도 가능하니까',
  ],
  custom: [],
}

// ============================================
// Sample Why Reasons by Area (Goal Creation)
// ============================================
export const SAMPLE_WHYS: Record<AreaType, string[]> = {
  health: [
    '건강하게 오래 살고 싶어서',
    '자신감을 키우고 싶어서',
    '체력이 모든 활동의 기반이라서',
    '스트레스를 줄이고 싶어서',
  ],
  career: [
    '더 나은 환경에서 일하고 싶어서',
    '전문성을 키우고 싶어서',
    '경제적 자유를 위해',
    '하고 싶은 일을 찾고 싶어서',
  ],
  finance: [
    '미래를 위한 안전망이 필요해서',
    '경제적 불안에서 벗어나고 싶어서',
    '하고 싶은 것을 할 수 있는 여유를 위해',
    '가족을 위한 준비를 하고 싶어서',
  ],
  relationships: [
    '소중한 사람들과 더 가까워지고 싶어서',
    '외로움을 줄이고 싶어서',
    '함께 성장하는 관계를 원해서',
    '인맥을 넓혀 기회를 만들고 싶어서',
  ],
  hobbies: [
    '삶에 즐거움이 필요해서',
    '새로운 나를 발견하고 싶어서',
    '일상에서 벗어나 재충전하고 싶어서',
    '꾸준히 성장하는 느낌을 받고 싶어서',
  ],
  mental: [
    '마음의 평화가 필요해서',
    '감정을 잘 다루고 싶어서',
    '번아웃을 예방하고 싶어서',
    '나 자신을 더 잘 이해하고 싶어서',
  ],
  learning: [
    '새로운 가능성을 열고 싶어서',
    '뒤처지고 싶지 않아서',
    '배우는 과정 자체가 즐거워서',
    '커리어 전환을 준비하고 싶어서',
  ],
  daily: [
    '하루를 알차게 보내고 싶어서',
    '작은 습관이 큰 변화를 만드니까',
    '규칙적인 생활이 안정감을 주니까',
    '기본이 탄탄해야 다른 목표도 가능하니까',
  ],
  custom: [],
}

// ============================================
// Sample Direction Statements (Direction Edit)
// ============================================
export const SAMPLE_DIRECTION_STATEMENTS: string[] = [
  '건강하고 당당한 삶을 살고 싶다',
  '성장하며 도전하는 삶을 살고 싶다',
  '사랑하는 사람들과 행복하게 살고 싶다',
  '자유롭고 안정적인 삶을 만들어가고 싶다',
]

// ============================================
// Sample Direction Why Reasons (Direction Edit)
// ============================================
export const SAMPLE_DIRECTION_WHYS: string[] = [
  '이렇게 살아야 후회가 없을 것 같아서',
  '내가 진짜 원하는 삶이니까',
  '이 방향이 나를 가장 나답게 만드니까',
  '소중한 사람들과 함께 행복하고 싶어서',
]

// ============================================
// Sample Group Names (Group Creation)
// ============================================
export const SAMPLE_GROUP_NAMES: string[] = ['그룹 1', '그룹 2', '그룹 3']

// ============================================
// Sample Group Why Reasons (Group Creation)
// ============================================
export const SAMPLE_GROUP_WHYS: string[] = [
  '기초가 없으면 다음 단계가 어려워서',
  '작은 성공 경험이 동기를 유지시켜서',
  '단계적 접근이 부담을 줄여서',
  '이 그룹이 가장 핵심적인 부분이라서',
]

// ============================================
// Goal Chip Options (v3 onboarding - brain dump)
// ============================================
export interface GoalChipOption {
  id: string
  label: string
  emoji: string
  areaType: AreaType
}

export const GOAL_CHIP_OPTIONS: GoalChipOption[] = [
  // 건강 (4개)
  { id: 'lose-weight', label: '살 빼기', emoji: '🏃', areaType: 'health' },
  { id: 'exercise-daily', label: '매일 운동', emoji: '💪', areaType: 'health' },
  { id: 'sleep-early', label: '일찍 자기', emoji: '😴', areaType: 'health' },
  { id: 'diet-manage', label: '식단 관리', emoji: '🥗', areaType: 'health' },
  // 커리어 (4개)
  { id: 'job-change', label: '이직 준비', emoji: '💼', areaType: 'career' },
  { id: 'side-project', label: '사이드프로젝트', emoji: '🚀', areaType: 'career' },
  { id: 'certification', label: '자격증', emoji: '📜', areaType: 'career' },
  { id: 'skill-up', label: '역량 키우기', emoji: '📈', areaType: 'career' },
  // 학습 (4개)
  { id: 'english', label: '영어 공부', emoji: '🇺🇸', areaType: 'learning' },
  { id: 'coding', label: '코딩 공부', emoji: '💻', areaType: 'learning' },
  { id: 'reading', label: '독서', emoji: '📖', areaType: 'learning' },
  { id: 'online-course', label: '온라인 강의', emoji: '🎓', areaType: 'learning' },
  // 재정 (4개)
  { id: 'saving', label: '저축하기', emoji: '💰', areaType: 'finance' },
  { id: 'investing', label: '재테크', emoji: '📊', areaType: 'finance' },
  { id: 'side-income', label: '부업', emoji: '💵', areaType: 'finance' },
  { id: 'expense-manage', label: '지출 관리', emoji: '🧾', areaType: 'finance' },
  // 관계 (4개)
  { id: 'family-time', label: '가족과 시간', emoji: '👨‍👩‍👧', areaType: 'relationships' },
  { id: 'networking', label: '인간관계', emoji: '🤝', areaType: 'relationships' },
  { id: 'meet-friends', label: '친구 만나기', emoji: '👋', areaType: 'relationships' },
  { id: 'partner-time', label: '연인과 시간', emoji: '💑', areaType: 'relationships' },
  // 마음 (4개)
  { id: 'meditation', label: '명상', emoji: '🧘', areaType: 'mental' },
  { id: 'journaling', label: '일기 쓰기', emoji: '✍️', areaType: 'mental' },
  { id: 'gratitude', label: '감사 연습', emoji: '🙏', areaType: 'mental' },
  { id: 'digital-detox', label: '디지털 디톡스', emoji: '📵', areaType: 'mental' },
  // 취미 (4개)
  { id: 'cooking', label: '요리 배우기', emoji: '🍳', areaType: 'hobbies' },
  { id: 'travel', label: '여행', emoji: '✈️', areaType: 'hobbies' },
  { id: 'learn-sport', label: '운동 배우기', emoji: '🏊', areaType: 'hobbies' },
  { id: 'instrument', label: '악기 연습', emoji: '🎸', areaType: 'hobbies' },
  // 일상 (4개)
  { id: 'morning-routine', label: '아침 루틴', emoji: '☀️', areaType: 'daily' },
  { id: 'organize', label: '정리정돈', emoji: '🧹', areaType: 'daily' },
  { id: 'drink-water', label: '물 마시기', emoji: '💧', areaType: 'daily' },
  { id: 'walking', label: '산책하기', emoji: '🚶', areaType: 'daily' },
]

// ============================================
// Custom Goal Area Classifier (keyword-based)
// ============================================
const AREA_KEYWORDS: Record<Exclude<AreaType, 'custom'>, string[]> = {
  health: [
    '운동',
    '살',
    '다이어트',
    '체중',
    '헬스',
    '건강',
    '수면',
    '잠',
    '자기',
    '식단',
    '먹',
    '영양',
    '체력',
    '스트레칭',
    '필라테스',
    '요가',
    '근력',
    '금연',
    '금주',
  ],
  career: [
    '이직',
    '취업',
    '회사',
    '업무',
    '커리어',
    '승진',
    '포트폴리오',
    '면접',
    '자격증',
    '사이드프로젝트',
    '창업',
    '프리랜서',
    '역량',
    '스킬',
  ],
  learning: [
    '공부',
    '영어',
    '코딩',
    '프로그래밍',
    '독서',
    '책',
    '강의',
    '학습',
    '자격',
    '시험',
    '외국어',
    '일본어',
    '중국어',
    '수학',
    '교육',
  ],
  finance: [
    '저축',
    '돈',
    '재테크',
    '투자',
    '주식',
    '부동산',
    '절약',
    '지출',
    '가계부',
    '부업',
    '수입',
    '연금',
    '보험',
    '자산',
  ],
  relationships: [
    '가족',
    '친구',
    '연인',
    '사람',
    '관계',
    '데이트',
    '부모',
    '아이',
    '소통',
    '대화',
    '인간관계',
    '모임',
    '만남',
  ],
  mental: [
    '명상',
    '일기',
    '마음',
    '감사',
    '디톡스',
    '스트레스',
    '멘탈',
    '감정',
    '심리',
    '힐링',
    '불안',
    '우울',
    '자존감',
    '셀프케어',
  ],
  hobbies: [
    '요리',
    '여행',
    '악기',
    '기타',
    '피아노',
    '그림',
    '사진',
    '게임',
    '등산',
    '캠핑',
    '수영',
    '자전거',
    '춤',
    '노래',
    '영화',
    '드라마',
    '취미',
  ],
  daily: [
    '루틴',
    '정리',
    '청소',
    '물',
    '산책',
    '아침',
    '저녁',
    '습관',
    '일찍',
    '규칙',
    '기상',
    '생활',
    '세탁',
    '요일',
  ],
}

/** Classify a custom goal text into the best-matching area type */
export function classifyCustomGoalArea(goalText: string): AreaType {
  const text = goalText.toLowerCase()
  let bestArea: AreaType = 'custom'
  let bestScore = 0

  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (text.includes(keyword)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestArea = area as AreaType
    }
  }

  return bestArea
}

// ============================================
// Onboarding Step Configuration
// ============================================
export const ONBOARDING_STEPS_V3 = ['welcome', 'brain-dump', 'life-organized'] as const
export const ONBOARDING_STEPS_V4 = ['welcome', 'goal-capture', 'first-action'] as const

export type OnboardingStepV3 = (typeof ONBOARDING_STEPS_V3)[number]
export type OnboardingStepV4 = (typeof ONBOARDING_STEPS_V4)[number]
export type OnboardingStep = OnboardingStepV3 | OnboardingStepV4
export type OnboardingFlowVersion = 'v3' | 'v4'

/** Steps shown in the progress indicator (excludes welcome) */
export const INDICATOR_STEPS_V3 = ['brain-dump', 'life-organized'] as const
export const INDICATOR_STEPS_V4 = ['goal-capture', 'first-action'] as const

export type IndicatorStepV3 = (typeof INDICATOR_STEPS_V3)[number]
export type IndicatorStepV4 = (typeof INDICATOR_STEPS_V4)[number]

export const STEP_CONFIG_V3: Record<IndicatorStepV3, { index: number; label: string }> = {
  'brain-dump': { index: 0, label: '쏟아내기' },
  'life-organized': { index: 1, label: '정리' },
}

export const STEP_CONFIG_V4: Record<IndicatorStepV4, { index: number; label: string }> = {
  'goal-capture': { index: 0, label: '목표 고르기' },
  'first-action': { index: 1, label: '내일 시작' },
}

// ============================================
// Goal Chip Categories (for grouped display in BrainDump)
// ============================================
export const GOAL_CHIP_CATEGORIES: Array<{ areaType: AreaType; label: string; emoji: string }> = [
  { areaType: 'health', label: '건강', emoji: '💪' },
  { areaType: 'career', label: '커리어', emoji: '💼' },
  { areaType: 'learning', label: '학습', emoji: '📚' },
  { areaType: 'finance', label: '재정', emoji: '💰' },
  { areaType: 'relationships', label: '관계', emoji: '❤️' },
  { areaType: 'mental', label: '마음', emoji: '🧘' },
  { areaType: 'hobbies', label: '취미', emoji: '🎨' },
  { areaType: 'daily', label: '일상', emoji: '☀️' },
]

// ============================================
// Sample Tasks by Area (onboarding first task)
// ============================================
export const SAMPLE_TASKS: Record<AreaType, string[]> = {
  health: ['30분 걷기', '스트레칭 10분', '물 8잔 마시기', '일찍 자기'],
  career: ['업무 관련 공부 30분', '영어 단어 10개', '포트폴리오 정리', '기술 블로그 읽기'],
  finance: ['지출 기록하기', '저축 자동이체 설정', '투자 뉴스 읽기', '가계부 쓰기'],
  relationships: ['가족에게 연락하기', '친구 만남 약속', '감사 표현하기', '대화 시간 갖기'],
  hobbies: ['책 30분 읽기', '악기 연습 20분', '그림 그리기', '새로운 레시피 도전'],
  mental: ['명상 10분', '일기 쓰기', '감사 3가지 적기', '디지털 디톡스 1시간'],
  learning: ['온라인 강의 1개', '새로운 개념 정리', '독서 30분', '외국어 연습 15분'],
  daily: ['아침 루틴 실행', '방 정리정돈', '물 마시기', '스트레칭 5분'],
  custom: [],
}
