import { OAuth2Client } from 'google-auth-library'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, getRedirectUri } from './config'

export function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, getRedirectUri())
}

export async function getAuthenticatedClient(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<OAuth2Client | null> {
  const { data: connection, error } = await supabase
    .from('google_calendar_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !connection) return null

  const auth = getOAuth2Client()
  auth.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  })

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0

  if (Date.now() >= expiresAt - 60_000) {
    try {
      const { credentials } = await auth.refreshAccessToken()
      auth.setCredentials(credentials)

      await supabase
        .from('google_calendar_connections')
        .update({
          access_token: credentials.access_token ?? connection.access_token,
          token_expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
        })
        .eq('user_id', userId)
    } catch {
      return null
    }
  }

  return auth
}
