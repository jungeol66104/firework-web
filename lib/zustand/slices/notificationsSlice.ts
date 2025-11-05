import { Notification } from '@/lib/types'
import { createClient } from '@/lib/supabase/clients/client'

export interface NotificationsSlice {
  notifications: Notification[]
  unreadCount: number
  isLoadingNotifications: boolean
  isDropdownOpen: boolean
  realtimeChannel: any | null

  // Actions
  setNotifications: (notifications: Notification[]) => void
  setUnreadCount: (count: number) => void
  addNotification: (notification: Notification) => void
  updateNotification: (id: string, updates: Partial<Notification>) => void
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAsUnread: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  toggleDropdown: () => void
  setDropdownOpen: (open: boolean) => void
  subscribeToNotifications: () => void
  unsubscribeFromNotifications: () => void
}

export const createNotificationsSlice = (set: any, get: any): NotificationsSlice => ({
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,
  isDropdownOpen: false,
  realtimeChannel: null,

  setNotifications: (notifications) => set({ notifications }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  addNotification: (notification) => set((state: any) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1
  })),

  updateNotification: (id, updates) => set((state: any) => {
    const notifications = state.notifications.map((n: Notification) =>
      n.id === id ? { ...n, ...updates } : n
    )

    // Recalculate unread count
    const unreadCount = notifications.filter((n: Notification) => !n.is_read).length

    return { notifications, unreadCount }
  }),

  fetchNotifications: async () => {
    const state = get() as NotificationsSlice

    // Prevent multiple simultaneous requests
    if (state.isLoadingNotifications) return

    set({ isLoadingNotifications: true })

    try {
      const response = await fetch('/api/notifications')

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()

      set({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
        isLoadingNotifications: false
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      set({ isLoadingNotifications: false })
    }
  },

  markAsRead: async (id) => {
    try {
      // Optimistically update UI
      get().updateNotification(id, { is_read: true })

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, isRead: true })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Revert on error
      await get().fetchNotifications()
    }
  },

  markAsUnread: async (id) => {
    try {
      // Optimistically update UI
      get().updateNotification(id, { is_read: false })

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, isRead: false })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as unread')
      }
    } catch (error) {
      console.error('Failed to mark notification as unread:', error)
      // Revert on error
      await get().fetchNotifications()
    }
  },

  markAllAsRead: async () => {
    try {
      // Optimistically update UI
      const state = get() as NotificationsSlice
      const notifications = state.notifications.map(n => ({ ...n, is_read: true }))
      set({ notifications, unreadCount: 0 })

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      // Revert on error
      await get().fetchNotifications()
    }
  },

  toggleDropdown: () => set((state: any) => ({ isDropdownOpen: !state.isDropdownOpen })),

  setDropdownOpen: (open) => set({ isDropdownOpen: open }),

  subscribeToNotifications: () => {
    const state = get() as NotificationsSlice

    // Don't subscribe if already subscribed
    if (state.realtimeChannel) {
      console.log('Already subscribed to notifications')
      return
    }

    const supabase = createClient()

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        console.log('No user found, cannot subscribe to notifications')
        return
      }

      console.log('Subscribing to notifications for user:', user.id)

      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 New notification received:', payload)
            get().addNotification(payload.new as Notification)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔄 Notification updated:', payload)
            const updated = payload.new as Notification
            get().updateNotification(updated.id, updated)
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status)
        })

      set({ realtimeChannel: channel })
    })
  },

  unsubscribeFromNotifications: () => {
    const state = get() as NotificationsSlice

    if (state.realtimeChannel) {
      state.realtimeChannel.unsubscribe()
      set({ realtimeChannel: null })
    }
  }
})
