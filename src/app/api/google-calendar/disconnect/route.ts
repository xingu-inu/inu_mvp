import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabase
    .from('google_calendar_connections')
    .delete()
    .eq('user_id', user.id)

  await supabase
    .from('tasks')
    .update({ google_event_id: null })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
