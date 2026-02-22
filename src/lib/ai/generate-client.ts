import { generateText } from 'ai'
import { getModel, DEFAULT_MODEL, type AiModelId } from './provider'

export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  modelId: AiModelId = DEFAULT_MODEL
): Promise<string> {
  const model = getModel(modelId)
  const { text, finishReason } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 8192,
    temperature: 0.7,
  })

  if (finishReason === 'length') {
    console.warn('[ai] Response may be truncated (hit maxOutputTokens)')
  }

  if (!text) {
    throw new Error('AI returned empty response')
  }

  return text
}
