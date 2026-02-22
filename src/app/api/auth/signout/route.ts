import { NextResponse } from 'next/server'
import { publicRoute } from '@/lib/security'

export const POST = publicRoute(
  'auth.signout',
  async (ctx): Promise<NextResponse> => {
    const { origin } = new URL(ctx.request.url)

    const { error } = await ctx.supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ error: '로그아웃에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.redirect(`${origin}/login`, { status: 302 })
  },
  { csrf: true, rateLimit: { limit: 5 } }
)
