import type { AreaType, RepeatType, TimeSlot } from '@/types/entities'

export interface GoalTemplateTask {
  name: string
  repeatType?: RepeatType
  timeSlot?: TimeSlot
}

export interface GoalTemplateGroup {
  name: string
  tasks: GoalTemplateTask[]
}

export interface GoalTemplate {
  id: string
  name: string
  emoji: string
  description: string
  areaType: AreaType
  groups: GoalTemplateGroup[]
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'exercise',
    name: '운동 시작하기',
    emoji: '🏃',
    description: '꾸준한 운동 습관으로 건강한 몸 만들기',
    areaType: 'health',
    groups: [
      {
        name: '습관 만들기',
        tasks: [
          { name: '매일 아침 스트레칭 10분', repeatType: 'daily', timeSlot: 'morning' },
          { name: '주 3회 유산소 운동', repeatType: 'weekly', timeSlot: 'morning' },
          { name: '운동 일지 기록하기', repeatType: 'daily', timeSlot: 'evening' },
        ],
      },
      {
        name: '장비 준비',
        tasks: [
          { name: '운동복 및 운동화 구매', repeatType: 'once' },
          { name: '헬스장 등록 또는 홈짐 세팅', repeatType: 'once' },
        ],
      },
      {
        name: '첫 목표',
        tasks: [
          { name: '한 달 운동 계획 세우기', repeatType: 'once' },
          { name: '첫 달 목표 체중 설정', repeatType: 'once' },
        ],
      },
    ],
  },
  {
    id: 'language',
    name: '새로운 언어 배우기',
    emoji: '📚',
    description: '체계적인 학습으로 새 언어를 정복하기',
    areaType: 'learning',
    groups: [
      {
        name: '어휘',
        tasks: [
          { name: '매일 단어 10개 암기', repeatType: 'daily', timeSlot: 'morning' },
          { name: '플래시카드 복습', repeatType: 'daily', timeSlot: 'evening' },
          { name: '단어장 앱 활용하기', repeatType: 'once' },
        ],
      },
      {
        name: '문법',
        tasks: [
          { name: '주 2회 문법 강의 수강', repeatType: 'weekly', timeSlot: 'afternoon' },
          { name: '문법 연습 문제 풀기', repeatType: 'weekdays', timeSlot: 'afternoon' },
        ],
      },
      {
        name: '회화 연습',
        tasks: [
          { name: '언어 교환 파트너 찾기', repeatType: 'once' },
          { name: '주 1회 원어민과 대화', repeatType: 'weekly', timeSlot: 'afternoon' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    name: '재정 건강',
    emoji: '💰',
    description: '탄탄한 재정 기반으로 경제적 자유 추구하기',
    areaType: 'finance',
    groups: [
      {
        name: '예산 관리',
        tasks: [
          { name: '월 예산 계획 세우기', repeatType: 'once' },
          { name: '매일 지출 기록하기', repeatType: 'daily', timeSlot: 'evening' },
          { name: '주간 지출 리뷰', repeatType: 'weekly', timeSlot: 'evening' },
        ],
      },
      {
        name: '저축',
        tasks: [
          { name: '비상금 목표 금액 설정', repeatType: 'once' },
          { name: '자동 이체 설정하기', repeatType: 'once' },
        ],
      },
      {
        name: '투자 배우기',
        tasks: [
          { name: '투자 관련 책 1권 읽기', repeatType: 'once' },
          { name: '소액 투자 시작해보기', repeatType: 'once' },
        ],
      },
    ],
  },
  {
    id: 'mindfulness',
    name: '마음 챙김',
    emoji: '🧘',
    description: '내면의 평화를 찾고 정신 건강 돌보기',
    areaType: 'mental',
    groups: [
      {
        name: '명상',
        tasks: [
          { name: '매일 아침 명상 10분', repeatType: 'daily', timeSlot: 'morning' },
          { name: '명상 앱 활용하기', repeatType: 'once' },
        ],
      },
      {
        name: '감정 일기',
        tasks: [
          { name: '저녁 감사 일기 쓰기', repeatType: 'daily', timeSlot: 'evening' },
          { name: '주간 감정 패턴 돌아보기', repeatType: 'weekly', timeSlot: 'evening' },
        ],
      },
      {
        name: '수면 개선',
        tasks: [
          { name: '취침 1시간 전 화면 끄기', repeatType: 'daily', timeSlot: 'evening' },
          { name: '일정한 기상 시간 지키기', repeatType: 'daily', timeSlot: 'dawn' },
        ],
      },
    ],
  },
  {
    id: 'side-project',
    name: '사이드 프로젝트',
    emoji: '💻',
    description: '아이디어를 현실로 만드는 나만의 프로젝트',
    areaType: 'career',
    groups: [
      {
        name: '아이디어 정리',
        tasks: [
          { name: '타겟 사용자 페르소나 작성', repeatType: 'once' },
          { name: '핵심 기능 목록 정리', repeatType: 'once' },
        ],
      },
      {
        name: 'MVP 개발',
        tasks: [
          { name: '주 5시간 이상 개발 시간 확보', repeatType: 'weekly', timeSlot: 'evening' },
          { name: '주간 진행 상황 정리', repeatType: 'weekly', timeSlot: 'evening' },
          { name: '첫 프로토타입 완성', repeatType: 'once' },
        ],
      },
      {
        name: '런칭',
        tasks: [
          { name: '베타 테스터 모집하기', repeatType: 'once' },
          { name: '피드백 수집 및 개선', repeatType: 'once' },
        ],
      },
    ],
  },
  {
    id: 'creative',
    name: '창작 활동',
    emoji: '🎨',
    description: '나만의 창작물로 세상에 표현하기',
    areaType: 'hobbies',
    groups: [
      {
        name: '기초 배우기',
        tasks: [
          { name: '온라인 강의 또는 책으로 기초 학습', repeatType: 'once' },
          { name: '매일 연습 시간 20분 확보', repeatType: 'daily', timeSlot: 'evening' },
        ],
      },
      {
        name: '작품 만들기',
        tasks: [
          { name: '주 1개 소품 완성하기', repeatType: 'weekly', timeSlot: 'anytime' },
          { name: '완성 작품 보관 폴더 만들기', repeatType: 'once' },
          { name: '월 1회 작업 회고하기', repeatType: 'once' },
        ],
      },
      {
        name: '공유하기',
        tasks: [
          { name: 'SNS 계정 만들어 작품 올리기', repeatType: 'once' },
          { name: '커뮤니티 피드백 받기', repeatType: 'once' },
        ],
      },
    ],
  },
]

export const AREA_TYPE_LABELS: Record<AreaType, string> = {
  health: '건강',
  career: '커리어',
  finance: '재정',
  relationships: '관계',
  hobbies: '취미',
  mental: '정신',
  learning: '학습',
  daily: '일상',
  custom: '기타',
}
