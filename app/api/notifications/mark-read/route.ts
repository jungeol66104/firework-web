import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { markNotificationAsRead, markNotificationAsUnread } from '@/lib/supabase/services/notificationService'

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

    const body = await request.json()
    const { notificationId, isRead } = body

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      )
    }

    if (typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'isRead must be a boolean' },
        { status: 400 }
      )
    }

    // Mark notification as read or unread
    if (isRead) {
      await markNotificationAsRead(supabase, notificationId, user.id)
    } else {
      await markNotificationAsUnread(supabase, notificationId, user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/notifications/mark-read:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
