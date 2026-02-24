import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

export type AiModelId = 'gemini-2.5-flash' | 'gpt-4.1' | 'gpt-5.1'

export const AI_MODELS: { value: AiModelId; label: string; description: string }[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini', description: '빠르고 가벼운' },
  { value: 'gpt-5.1', label: 'GPT', description: '깊이 있는 분석' },
]

export const DEFAULT_MODEL: AiModelId = 'gemini-2.5-flash'

// Lazy singletons — created once per server process, safe for Next.js App Router
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null
let _openai: ReturnType<typeof createOpenAI> | null = null

function getGoogleProvider() {
  if (!_google) _google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  return _google
}

function getOpenAIProvider() {
  if (!_openai) _openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export function getModel(modelId: AiModelId) {
  switch (modelId) {
    case 'gpt-4.1':
      return getOpenAIProvider()('gpt-4.1')
    case 'gpt-5.1':
      return getOpenAIProvider()('gpt-5.1')
    case 'gemini-2.5-flash':
    default:
      return getGoogleProvider()('gemini-2.5-flash')
  }
}

export function isGeminiModel(modelId: AiModelId): boolean {
  return modelId.startsWith('gemini')
}
