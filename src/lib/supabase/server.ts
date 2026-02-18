import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: options?.httpOnly ?? true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
              })
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
