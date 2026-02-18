import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Origin validation — reject cross-origin signout requests (CSRF protection)
  const headersList = await headers()
  const origin = headersList.get('origin')
  const { origin: requestOrigin } = new URL(request.url)

  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: '로그아웃에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.redirect(`${requestOrigin}/login`, {
    status: 302,
  })
}
