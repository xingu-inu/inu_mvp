// Error Codes & Types
// Phase 4.5: API Design & Server Actions

/**
 * API 에러 코드 체계
 *
 * 1xxx: 인증 관련 에러
 * 2xxx: 유효성 검사 에러
 * 3xxx: 리소스 에러
 * 4xxx: 비즈니스 로직 에러
 * 5xxx: 서버 에러
 * 6xxx: 네트워크 에러 (클라이언트 측)
 */
export enum ErrorCode {
  // 인증 에러 (1xxx)
  AUTH_REQUIRED = 'AUTH_REQUIRED', // 1001: 로그인 필요
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN', // 1002: 토큰 무효
  AUTH_EXPIRED = 'AUTH_EXPIRED', // 1003: 토큰 만료
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN', // 1004: 권한 없음
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS', // 1005: 잘못된 인증 정보
  AUTH_EMAIL_IN_USE = 'AUTH_EMAIL_IN_USE', // 1006: 이미 사용 중인 이메일
  AUTH_EMAIL_NOT_CONFIRMED = 'AUTH_EMAIL_NOT_CONFIRMED', // 1007: 이메일 미인증

  // 유효성 검사 에러 (2xxx)
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 2001: 입력값 오류
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED', // 2002: 필수값 누락
  VALIDATION_FORMAT = 'VALIDATION_FORMAT', // 2003: 형식 오류

  // 리소스 에러 (3xxx)
  NOT_FOUND = 'NOT_FOUND', // 3001: 리소스 없음
  ALREADY_EXISTS = 'ALREADY_EXISTS', // 3002: 이미 존재
  CONFLICT = 'CONFLICT', // 3003: 충돌

  // 비즈니스 로직 에러 (4xxx)
  CHECKIN_ALREADY_EXISTS = 'CHECKIN_ALREADY_EXISTS', // 4001: 오늘 이미 체크인
  GOAL_LIMIT_EXCEEDED = 'GOAL_LIMIT_EXCEEDED', // 4002: Active Goal 한도 초과
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED', // 4003: AI 사용량 초과
  AI_RATE_LIMITED = 'AI_RATE_LIMITED', // 4004: AI 요청 제한
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED', // 4005: AI 생성 실패
  RATE_LIMITED = 'RATE_LIMITED', // 4006: 요청 제한

  // 서버 에러 (5xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR', // 5001: 서버 내부 오류
  DATABASE_ERROR = 'DATABASE_ERROR', // 5002: DB 오류
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR', // 5003: 외부 API 오류

  // 네트워크 에러 (6xxx) - 클라이언트 측
  NETWORK_OFFLINE = 'NETWORK_OFFLINE', // 6001: 오프라인
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT', // 6002: 타임아웃
}

/**
 * 에러 코드별 기본 메시지 (한국어)
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 인증
  [ErrorCode.AUTH_REQUIRED]: '로그인이 필요합니다.',
  [ErrorCode.AUTH_INVALID_TOKEN]: '인증 정보가 올바르지 않습니다.',
  [ErrorCode.AUTH_EXPIRED]: '로그인이 만료되었습니다. 다시 로그인해주세요.',
  [ErrorCode.AUTH_FORBIDDEN]: '접근 권한이 없습니다.',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '이메일 또는 비밀번호가 올바르지 않습니다.',
  [ErrorCode.AUTH_EMAIL_IN_USE]: '이미 사용 중인 이메일입니다.',
  [ErrorCode.AUTH_EMAIL_NOT_CONFIRMED]: '이메일 인증을 완료해주세요.',

  // 유효성 검사
  [ErrorCode.VALIDATION_ERROR]: '입력값을 확인해주세요.',
  [ErrorCode.VALIDATION_REQUIRED]: '필수 항목을 입력해주세요.',
  [ErrorCode.VALIDATION_FORMAT]: '입력 형식이 올바르지 않습니다.',

  // 리소스
  [ErrorCode.NOT_FOUND]: '요청하신 항목을 찾을 수 없습니다.',
  [ErrorCode.ALREADY_EXISTS]: '이미 존재하는 항목입니다.',
  [ErrorCode.CONFLICT]: '다른 작업과 충돌이 발생했습니다.',

  // 비즈니스 로직
  [ErrorCode.CHECKIN_ALREADY_EXISTS]: '오늘 이미 달성했어요.',
  [ErrorCode.GOAL_LIMIT_EXCEEDED]: '활성 목표 수가 한도를 초과했습니다.',
  [ErrorCode.AI_QUOTA_EXCEEDED]: 'AI 사용량이 초과되었습니다.',
  [ErrorCode.AI_RATE_LIMITED]: 'AI 요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
  [ErrorCode.AI_GENERATION_FAILED]: 'AI 응답 생성에 실패했어요. 다시 시도해주세요.',
  [ErrorCode.RATE_LIMITED]: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',

  // 서버
  [ErrorCode.INTERNAL_ERROR]: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCode.DATABASE_ERROR]: '데이터 처리 중 오류가 발생했습니다.',
  [ErrorCode.EXTERNAL_API_ERROR]: '외부 서비스 연동 중 오류가 발생했습니다.',

  // 네트워크
  [ErrorCode.NETWORK_OFFLINE]: '인터넷 연결을 확인해주세요.',
  [ErrorCode.NETWORK_TIMEOUT]: '응답 시간이 초과되었습니다.',
}

/**
 * 에러 코드에 대한 기본 메시지 반환
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR]
}
