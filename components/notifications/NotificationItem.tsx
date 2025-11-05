"use client"

import React from 'react'
import { Notification } from '@/lib/types'
import { CircleAlert, Check } from 'lucide-react'
import { useMarkNotificationAsRead, useMarkNotificationAsUnread } from '@/lib/zustand/store'
import { useRouter } from 'next/navigation'

interface NotificationItemProps {
  notification: Notification
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const markAsRead = useMarkNotificationAsRead()
  const markAsUnread = useMarkNotificationAsUnread()
  const router = useRouter()

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.is_read) {
      markAsUnread(notification.id)
    } else {
      markAsRead(notification.id)
    }
  }

  const handleClick = () => {
    // Navigate to corresponding page
    // Check report_id first (이의신청 관련)
    if (notification.report_id) {
      router.push('/dashboard')
    } else if (notification.payment_id) {
      router.push('/dashboard')
    } else if (notification.interview_id) {
      // Generation-related notifications
      router.push(`/interview?id=${notification.interview_id}`)
    }
  }

  const getRelativeTime = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return '방금 전'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}분 전`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}시간 전`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}일 전`
    }
  }

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 pt-[4.5px]">
        {!notification.is_read && (
          <CircleAlert className="h-2.5 w-2.5 text-blue-600 fill-blue-600" />
        )}
        {notification.is_read && <div className="w-2.5 h-2.5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{notification.message}</p>
        <p className="text-xs text-gray-500 mt-1">{getRelativeTime(notification.created_at)}</p>
      </div>

      {/* Check button */}
      <button
        onClick={handleToggleRead}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
        title={notification.is_read ? '읽지 않음으로 표시' : '읽음으로 표시'}
      >
        {notification.is_read ? (
          <Check className="w-4 h-4 text-blue-600" />
        ) : (
          <Check className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  )
}
