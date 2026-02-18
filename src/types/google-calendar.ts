export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink: string
  isAllDay: boolean
  startMinutes: number
  durationMinutes: number
  dateStr: string
}

export interface GoogleCalendarConnection {
  id: string
  user_id: string
  calendar_id: string
  sync_enabled: boolean
  created_at: string
  updated_at: string
}

export interface GoogleCalendarEventsResponse {
  events: GoogleCalendarEvent[]
  connected: boolean
}
