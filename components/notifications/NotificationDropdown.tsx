"use client"

import React, { useRef, useEffect } from 'react'
import { CheckCheck } from 'lucide-react'
import { NotificationItem } from './NotificationItem'
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
  useSetNotificationDropdownOpen
} from '@/lib/zustand/store'

export const NotificationDropdown: React.FC = () => {
  const notifications = useNotifications()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const setDropdownOpen = useSetNotificationDropdownOpen()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setDropdownOpen])

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">알림</h3>
        <button
          onClick={handleMarkAllAsRead}
          disabled={!notifications.some(n => !n.is_read)}
          className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          title="모두 읽음으로 표시"
        >
          <CheckCheck className="h-4 w-4 text-blue-600" />
        </button>
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
