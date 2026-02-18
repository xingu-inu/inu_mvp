import type { AreaType } from '@/types/entities'

// ============================================
// Types
// ============================================

export interface WhySuggestion {
  text: string
}

export interface CrossAreaSuggestion {
  areaId: string
  emoji: string
  areaName: string
  text: string
}

// ============================================
// Task Name Templates (by Area type)
// ============================================

const TASK_NAME_TEMPLATES: Record<AreaType, string[]> = {
  health: [
    '매일 30분 운동',
    '스트레칭 15분',
    '물 2L 마시기',
    '7시간 수면',
    '식단 기록',
    '걷기 1만보',
    '계단 오르기',
    '홈트레이닝 20분',
  ],
  career: [
    '매일 1시간 공부',
    '프로젝트 작업 30분',
    '독서 20분',
    '온라인 강의 1강',
    '포트폴리오 정리',
    '사이드 프로젝트 30분',
    '업무 회고 10분',
    '네트워킹 활동',
  ],
  finance: [
    '가계부 기록',
    '지출 점검 10분',
    '투자 공부 20분',
    '절약 챌린지',
    '재정 목표 점검',
    '자동 저축 확인',
  ],
  relationships: [
    '가족에게 연락',
    '감사 표현하기',
    '약속 잡기',
    '함께 식사하기',
    '안부 메시지 보내기',
    '경청 연습',
  ],
  hobbies: [
    '취미 활동 30분',
    '창작 시간 20분',
    '새로운 것 시도',
    '감상/기록 남기기',
    '연습 30분',
    '작품 완성하기',
  ],
  mental: [
    '명상 10분',
    '일기 쓰기',
    '감정 기록',
    '디지털 디톡스 1시간',
    '산책 20분',
    '심호흡 5분',
    '감사 일기 3가지',
  ],
  learning: [
    '새로운 기술 공부 30분',
    '온라인 강의 1강',
    '독서 30분',
    '외국어 공부 20분',
    '노트 정리 15분',
    'TIL 기록',
  ],
  daily: [
    '아침 루틴',
    '정리정돈 15분',
    '물 마시기',
    '스트레칭 10분',
    '하루 계획 세우기',
    '취침 루틴',
  ],
  custom: ['매일 30분 실천', '15분 집중', '기록 남기기', '꾸준히 연습'],
}

// ============================================
// Why Templates (by Area type, {goalName} placeholder)
// ============================================

const WHY_TEMPLATES: Record<AreaType, string[]> = {
  health: [
    '{goalName}을 위한 핵심 실천이에요',
    '꾸준히 하면 {goalName}의 탄탄한 기반이 돼요',
    '작은 실천이 큰 건강 변화를 만들어요',
  ],
  career: [
    '{goalName}에 한 걸음 더 가까워지는 실천이에요',
    '매일 조금씩 {goalName}을 향해 나아가요',
    '꾸준한 노력이 전문성을 만들어요',
  ],
  finance: [
    '{goalName}을 위한 재정 습관이에요',
    '작은 관리가 {goalName}의 기초가 돼요',
    '돈 관리는 미래의 나를 위한 투자예요',
  ],
  relationships: [
    '{goalName}을 위해 관계에 투자하는 시간이에요',
    '작은 관심이 {goalName}에 큰 변화를 만들어요',
    '소중한 사람들과의 연결을 지켜요',
  ],
  hobbies: [
    '{goalName}을 즐기면서 성장하는 시간이에요',
    '꾸준한 연습이 {goalName}의 즐거움을 더해요',
    '나만의 시간이 삶의 활력이 돼요',
  ],
  mental: [
    '{goalName}을 위해 마음을 돌보는 시간이에요',
    '내면의 안정이 {goalName}의 기반이 돼요',
    '마음 챙김은 모든 영역의 기초예요',
  ],
  learning: [
    '{goalName}을 위한 배움의 시간이에요',
    '매일 배우면 {goalName}에 확실히 다가가요',
    '지식의 축적이 가능성을 넓혀요',
  ],
  daily: [
    '{goalName}을 위한 일상 루틴이에요',
    '기본이 탄탄해야 다른 목표도 잘 돼요',
    '좋은 습관이 좋은 하루를 만들어요',
  ],
  custom: ['{goalName}을 위한 실천이에요', '꾸준히 하면 분명 달라져요'],
}

// ============================================
// Cross-area Relationship Map
// ============================================

const CROSS_AREA_MAP: Record<string, Record<string, string>> = {
  health: {
    career: '체력 향상은 업무 집중력에도 도움이 돼요',
    mental: '규칙적인 운동은 마음 안정에도 좋아요',
    relationships: '건강해야 사랑하는 사람들과 오래 함께해요',
    learning: '좋은 컨디션이 학습 효율을 높여요',
  },
  career: {
    finance: '커리어 성장은 재정적 안정으로도 이어져요',
    mental: '성장하는 느낌이 자존감을 높여줘요',
    health: '적절한 휴식이 업무 효율을 올려요',
    relationships: '전문성은 주변의 신뢰를 높여요',
  },
  finance: {
    mental: '재정 안정이 마음의 여유를 줘요',
    relationships: '경제적 여유가 관계에도 긍정적이에요',
    career: '재정 관리 능력은 커리어에도 도움이 돼요',
  },
  relationships: {
    mental: '좋은 관계는 정서적 안정의 기반이에요',
    career: '든든한 관계가 커리어의 지지대가 돼요',
    health: '함께하는 활동이 건강에도 좋아요',
  },
  hobbies: {
    mental: '즐거운 활동은 삶의 활력이 돼요',
    relationships: '취미를 함께하면 관계도 깊어져요',
    career: '창의성이 업무에도 긍정적이에요',
  },
  mental: {
    health: '마음이 건강해야 몸도 건강해져요',
    relationships: '내면의 안정이 관계에도 긍정적이에요',
    career: '맑은 마음이 더 나은 판단을 도와요',
  },
  learning: {
    career: '배움이 커리어의 가능성을 넓혀요',
    mental: '새로운 지식이 자신감을 높여줘요',
    hobbies: '배움 자체가 즐거운 취미가 돼요',
  },
  daily: {
    health: '규칙적인 생활이 건강의 기본이에요',
    mental: '안정된 루틴이 마음의 평화를 줘요',
    career: '좋은 습관이 생산성을 높여요',
  },
}

// ============================================
// Public API
// ============================================

/**
 * Area 타입별 추천 Task 이름 목록
 */
export function getTaskNameSuggestions(areaType: AreaType): string[] {
  return TASK_NAME_TEMPLATES[areaType] ?? TASK_NAME_TEMPLATES.custom
}

/**
 * Goal 컨텍스트 기반 Why 추천 목록
 * - Goal의 why가 있으면 맨 앞에 포함
 * - Area 타입별 템플릿에서 {goalName} 치환
 */
export function getWhySuggestions(
  goal: { name: string; why?: string | null },
  area: { type: AreaType }
): WhySuggestion[] {
  const suggestions: WhySuggestion[] = []

  // Goal의 why가 있으면 맨 앞에
  if (goal.why) {
    suggestions.push({ text: goal.why })
  }

  // Area 타입별 템플릿
  const templates = WHY_TEMPLATES[area.type] ?? WHY_TEMPLATES.custom
  for (const template of templates) {
    const text = template.replace(/\{goalName\}/g, goal.name)
    // Goal.why와 중복이면 건너뛰기
    if (text !== goal.why) {
      suggestions.push({ text })
    }
  }

  return suggestions
}

/**
 * Cross-area 연결 추천 목록
 * - 현재 Area 타입에서 다른 Area로의 연결만 반환
 * - 사용자가 실제로 가진 Area만 매칭
 */
export function getCrossAreaSuggestions(
  area: { type: AreaType },
  otherAreas: Array<{ id: string; type: AreaType; name: string; emoji: string }>
): CrossAreaSuggestion[] {
  const map = CROSS_AREA_MAP[area.type]
  if (!map) return []

  const suggestions: CrossAreaSuggestion[] = []

  for (const other of otherAreas) {
    const text = map[other.type]
    if (text) {
      suggestions.push({
        areaId: other.id,
        emoji: other.emoji,
        areaName: other.name,
        text,
      })
    }
  }

  return suggestions
}
