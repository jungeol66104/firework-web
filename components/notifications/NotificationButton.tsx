"use client"

import React, { useEffect } from 'react'
import { Bell, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from './NotificationDropdown'
import {
  useUnreadCount,
  useNotificationDropdownOpen,
  useToggleNotificationDropdown,
  useFetchNotifications,
  useSubscribeToNotifications,
  useUnsubscribeFromNotifications
} from '@/lib/zustand/store'

export const NotificationButton: React.FC = () => {
  const unreadCount = useUnreadCount()
  const isDropdownOpen = useNotificationDropdownOpen()
  const toggleDropdown = useToggleNotificationDropdown()
  const fetchNotifications = useFetchNotifications()
  const subscribeToNotifications = useSubscribeToNotifications()
  const unsubscribeFromNotifications = useUnsubscribeFromNotifications()

  // Fetch notifications on mount and subscribe to realtime updates
  useEffect(() => {
    fetchNotifications()
    subscribeToNotifications()

    return () => {
      unsubscribeFromNotifications()
    }
  }, [])

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 relative"
        onClick={toggleDropdown}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-[3px] -right-[3px] h-2.5 w-2.5 bg-blue-600 rounded-full" />
        )}
      </Button>

      {isDropdownOpen && <NotificationDropdown />}
    </div>
  )
}
