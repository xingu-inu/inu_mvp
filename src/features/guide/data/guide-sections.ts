export interface GuideStep {
  id: string
  title: string
  description: string
  tips?: string[]
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: '반가워요, inu예요 🐾',
    description: '목표를 세우고, 매일 실천하고, 돌아보는 자기개발 앱이에요. 하나씩 알려드릴게요.',
  },
  {
    id: 'checkin',
    title: '탭 한 번으로 체크인 ✅',
    description:
      '할 일을 완료하면 Done, 오늘은 쉬고 싶으면 Skip. 둘 다 괜찮아요. 의도적 Skip은 스트릭이 유지돼요.',
    tips: ['매일 15초면 체크인이 끝나요'],
  },
  {
    id: 'streak',
    title: '스트릭으로 꾸준히 🔥',
    description:
      '연속으로 실천하면 스트릭이 쌓여요. 끊겨도 누적 기록은 남고, 새 라운드로 다시 시작할 수 있어요.',
    tips: ['5일마다 축하 애니메이션이 나와요'],
  },
  {
    id: 'mood',
    title: '오늘의 기분 기록 😊',
    description:
      '체크인 후 기분을 이모지로 남겨보세요. 리뷰에서 기분 변화와 실천의 관계를 발견할 수 있어요.',
  },
  {
    id: 'roadmap',
    title: '로드맵으로 큰 그림 🗺️',
    description:
      '영역 → 목표 → 실천, 3단계로 정리돼요. 각 레벨에 "왜?"를 적으면 동기가 선명해져요.',
    tips: ['Active 목표는 3-5개가 적당해요'],
  },
  {
    id: 'review',
    title: '리뷰로 패턴 발견 📊',
    description:
      '완료율, 기분 변화, 스트릭을 한눈에 볼 수 있어요. 내가 언제 잘하고, 어떤 패턴이 있는지 발견해보세요.',
  },
  {
    id: 'philosophy',
    title: '완벽하지 않아도 괜찮아요 🌱',
    description:
      'inu는 못 해도 비난하지 않아요. 매일 조금씩, 내 페이스대로. 방향이 바뀌어도, 쉬어야 할 때 쉬어도, 모든 건 과정의 일부예요.',
  },
]
