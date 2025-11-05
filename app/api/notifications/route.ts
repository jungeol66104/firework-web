import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { fetchNotifications, getUnreadCount } from '@/lib/supabase/services/notificationService'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    // Fetch notifications and unread count
    const [notifications, unreadCount] = await Promise.all([
      fetchNotifications(supabase, user.id, limit),
      getUnreadCount(supabase, user.id)
    ])

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
