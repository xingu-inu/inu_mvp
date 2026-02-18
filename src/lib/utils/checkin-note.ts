import type { MoodLevel } from '@/types/entities'

export interface CheckInNoteData {
  mood?: MoodLevel
  text?: string
}

/**
 * Parse check-in note field (JSON or plain text).
 * Backward compatible: plain strings become { text: string }.
 */
export function parseCheckInNote(note: string | null): CheckInNoteData {
  if (!note) return {}
  try {
    const parsed = JSON.parse(note)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as CheckInNoteData
    }
    return { text: note }
  } catch {
    return { text: note }
  }
}

/**
 * Serialize CheckInNoteData to string for storage.
 * If only text (no mood), stores as plain string for simplicity.
 * Returns undefined if empty (clears the note).
 */
export function serializeCheckInNote(data: CheckInNoteData): string | undefined {
  const { mood, text } = data
  if (!mood && !text) return undefined
  if (!mood && text) return text
  return JSON.stringify({ mood, text: text || undefined })
}
