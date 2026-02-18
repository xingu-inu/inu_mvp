export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events']

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${base}/api/google-calendar/callback`
}
