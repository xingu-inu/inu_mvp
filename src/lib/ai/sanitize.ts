// AI Security — Input sanitization & output validation utilities
// Defense-in-depth against prompt injection (OWASP LLM Top 10 #1)

// ── Injection Pattern Detection ──

const INJECTION_PATTERNS_EN = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /reveal\s+(your|the|system)\s+(prompt|instructions?)/i,
  /show\s+(me\s+)?(your|the|system)\s+(prompt|instructions?)/i,
  /output\s+(your|the|system)\s+(prompt|instructions?)/i,
  /print\s+(your|the|system)\s+(prompt|instructions?)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+(to\s+be|you\s+are)\s+/i,
  /act\s+as\s+(a|an|if)\s+/i,
  /new\s+(role|instructions?|persona)\s*:/i,
  /override\s+(your|the|all)\s+(rules?|instructions?|prompt)/i,
  /bypass\s+(your|the|all)\s+(rules?|instructions?|safety|filters?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+(enabled|on|activate)/i,
]

const INJECTION_PATTERNS_KO = [
  /시스템\s*프롬프트를?\s*(출력|보여|알려|공개|말해)/,
  /이전\s*(지시|명령|규칙|프롬프트)를?\s*(무시|잊어|버려|취소)/,
  /모든\s*(규칙|지시|명령)을?\s*(무시|잊어|버려|취소)/,
  /새로운\s*(역할|지시|명령|규칙)\s*:/,
  /당신은\s*(이제|지금부터)\s*/,
  /너는\s*(이제|지금부터)\s*/,
  /역할을?\s*(바꿔|변경|전환)/,
  /내부\s*(구조|정보|설정)를?\s*(알려|보여|공개)/,
  /API\s*키를?\s*(알려|보여|공개)/,
]

/**
 * Detect common prompt injection patterns in user text.
 * Returns true if suspicious patterns are found.
 * Used for logging/monitoring — NOT for blocking (to avoid false positives).
 */
export function detectInjectionPatterns(text: string): boolean {
  const allPatterns = [...INJECTION_PATTERNS_EN, ...INJECTION_PATTERNS_KO]
  return allPatterns.some((pattern) => pattern.test(text))
}

// ── Input Sanitization ──

/**
 * Escape XML-like delimiter tags that could break prompt boundaries.
 * Prevents users from injecting closing/opening tags like </user_data>
 * to escape the data context and inject instructions.
 */
export function sanitizeUserText(text: string): string {
  return text
    .replace(/<\/?user_data>/gi, (match) => match.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?user_input>/gi, (match) => match.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?system>/gi, (match) => match.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?instructions?>/gi, (match) => match.replace('<', '&lt;').replace('>', '&gt;'))
}

/**
 * Sanitize all string fields in an AI context object.
 * Applies sanitizeUserText to every non-null string value (shallow).
 */
export function sanitizeContext<T extends Record<string, unknown>>(context: T): T {
  const sanitized = { ...context }
  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key]
    if (typeof value === 'string') {
      ;(sanitized as Record<string, unknown>)[key] = sanitizeUserText(value)
    } else if (Array.isArray(value)) {
      ;(sanitized as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeUserText(item) : item
      )
    }
  }
  return sanitized
}

// ── Output Validation ──

const CRITICAL_LEAK_PATTERNS = [
  // API key formats (Gemini, OpenAI, generic)
  /AIzaSy[0-9A-Za-z_-]{33}/,
  /sk-[0-9A-Za-z]{48,}/,
  /API[_\s]?KEY\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/i,
  /GEMINI[_\s]?API[_\s]?KEY\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/i,
]

const SUSPICIOUS_LEAK_PATTERNS = [
  /시스템\s*프롬프트\s*[:：]\s*/,
  /system\s*prompt\s*[:：]\s*/i,
  /my\s*instructions?\s*(are|is)\s*[:：]?\s*/i,
  /내\s*지시\s*사항\s*[:：]\s*/,
]

interface OutputValidationResult {
  safe: boolean
  text: string
  warnings: string[]
}

/**
 * Validate AI output for sensitive data leakage.
 * - Critical patterns (API keys): block the response entirely
 * - Suspicious patterns (system prompt mentions): log warning, pass through
 */
export function validateAiOutput(text: string): OutputValidationResult {
  const warnings: string[] = []

  // Critical: API key leakage — block
  for (const pattern of CRITICAL_LEAK_PATTERNS) {
    if (pattern.test(text)) {
      console.error('[ai-security] CRITICAL: API key pattern detected in AI output')
      return {
        safe: false,
        text: '죄송합니다. 응답을 생성하지 못했어요. 다시 시도해주세요.',
        warnings: ['API key leakage detected'],
      }
    }
  }

  // Suspicious: system prompt leakage — warn but pass through
  for (const pattern of SUSPICIOUS_LEAK_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push('Possible system prompt leakage pattern detected')
    }
  }

  if (warnings.length > 0) {
    console.warn('[ai-security] Suspicious output patterns:', warnings)
  }

  return { safe: true, text, warnings }
}
