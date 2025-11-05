import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { markAllNotificationsAsRead } from '@/lib/supabase/services/notificationService'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Mark all notifications as read for current user
    await markAllNotificationsAsRead(supabase, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/notifications/mark-all-read:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
