import { GoogleGenerativeAI } from '@google/generative-ai'
import { AI_MODEL, GENERATION_CONFIG } from './constants'

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

export async function generateContent(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient()
  const model = client.getGenerativeModel({
    model: AI_MODEL,
    generationConfig: GENERATION_CONFIG,
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContent(userPrompt)
  const response = result.response
  const text = response.text()

  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason === 'MAX_TOKENS') {
    console.warn('[ai] Response truncated due to max tokens. Length:', text?.length)
  }

  if (!text || text.trim().length === 0) {
    const blockReason = response.promptFeedback?.blockReason
    if (blockReason) {
      throw new Error(`AI response blocked: ${blockReason}`)
    }
    throw new Error('AI returned empty response')
  }

  return text
}
