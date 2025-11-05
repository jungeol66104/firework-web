import { SupabaseClient } from '@supabase/supabase-js'
import { Notification, CreateNotificationParams } from '@/lib/types'

/**
 * Create a new notification
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: params.user_id,
        type: params.type,
        message: params.message,
        interview_id: params.interview_id || null,
        interview_qas_id: params.interview_qas_id || null,
        report_id: params.report_id || null,
        payment_id: params.payment_id || null,
        metadata: params.metadata || {},
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    throw new Error(`Failed to create notification: ${error.message}`)
  }

  return data
}

/**
 * Fetch notifications for a user (latest 50)
 */
export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  return data || []
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to get unread count:', error)
    throw new Error(`Failed to get unread count: ${error.message}`)
  }

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }
}

/**
 * Mark a notification as unread
 */
export async function markNotificationAsUnread(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: false })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to mark notification as unread:', error)
    throw new Error(`Failed to mark notification as unread: ${error.message}`)
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    throw new Error(`Failed to mark all notifications as read: ${error.message}`)
  }
}
