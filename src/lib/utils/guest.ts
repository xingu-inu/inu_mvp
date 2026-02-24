import type { User } from '@supabase/supabase-js'

/** Check if the current user is an anonymous (guest) user */
export function isGuestUser(user: User | null | undefined): boolean {
  return user?.is_anonymous === true
}
