import { generateText } from 'ai'
import { getModel, isGeminiModel, DEFAULT_MODEL, type AiModelId } from './provider'

interface GenerateOptions {
  /** Enable JSON output mode (lower temperature + Gemini responseMimeType) */
  json?: boolean
  temperature?: number
}

export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  modelId: AiModelId = DEFAULT_MODEL,
  options?: GenerateOptions
): Promise<string> {
  const isJson = options?.json ?? false
  const temperature = options?.temperature ?? (isJson ? 0.4 : 0.7)

  const model = getModel(modelId)
  const { text, finishReason } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 8192,
    temperature,
    // Enable native JSON mode for Gemini — eliminates markdown wrapping and malformed JSON
    ...(isJson &&
      isGeminiModel(modelId) && {
        providerOptions: {
          google: { responseMimeType: 'application/json' },
        },
      }),
  })

  if (finishReason === 'length') {
    console.warn('[ai] Response may be truncated (hit maxOutputTokens)')
  }

  if (!text) {
    throw new Error('AI returned empty response')
  }

  return text
}
