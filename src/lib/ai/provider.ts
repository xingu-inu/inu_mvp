import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

export type AiModelId = 'gemini-2.5-flash' | 'gpt-4.1' | 'gpt-5.1'

export const AI_MODELS: { value: AiModelId; label: string; description: string }[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini', description: '빠르고 가벼운' },
  { value: 'gpt-5.1', label: 'GPT', description: '깊이 있는 분석' },
]

export const DEFAULT_MODEL: AiModelId = 'gemini-2.5-flash'

export function getModel(modelId: AiModelId) {
  switch (modelId) {
    case 'gpt-4.1':
    case 'gpt-5.1': {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      return openai('gpt-5.1')
    }
    case 'gemini-2.5-flash':
    default: {
      const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
      return google('gemini-2.5-flash')
    }
  }
}
