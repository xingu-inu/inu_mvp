import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { origin } = new URL(request.url)

  // Sign out the user
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: '로그아웃에 실패했습니다.' }, { status: 500 })
  }

  // Redirect to login page
  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  })
}

export async function GET(request: Request) {
  // Also support GET for simple redirects
  return POST(request)
}
