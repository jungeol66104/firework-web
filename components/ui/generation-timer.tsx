"use client"

import { useState, useEffect } from "react"

interface GenerationTimerProps {
  startTime: string // ISO string from created_at
  isActive: boolean // whether the job is still active
}

export function GenerationTimer({ startTime, isActive }: GenerationTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isActive) return

    // Handle timestamp format properly for timezone consistency
    let cleanedStartTime = startTime
    
    // Remove microseconds if present (keep only milliseconds - 3 digits)
    // But preserve timezone information
    if (startTime.includes('.')) {
      const parts = startTime.split('.')
      if (parts[1] && parts[1].length > 3) {
        // Find timezone part (everything after +, -, or Z)
        const timezoneMatch = parts[1].match(/(\+\d{2}:\d{2}|Z|-\d{2}:\d{2})$/)
        const timezonePart = timezoneMatch ? timezoneMatch[1] : ''
        
        // Keep only first 3 digits of fractional seconds + timezone
        const fractionalPart = parts[1].substring(0, 3)
        cleanedStartTime = parts[0] + '.' + fractionalPart + timezonePart
      }
    }
    
    // Handle timezone: 
    // If no timezone info, assume UTC (for backwards compatibility with old jobs)
    if (!cleanedStartTime.includes('Z') && !cleanedStartTime.includes('+') && !cleanedStartTime.includes('-')) {
      cleanedStartTime += 'Z'
    }
    
    const start = new Date(cleanedStartTime).getTime()
    
    
    // Validate timestamp
    if (isNaN(start)) {
      console.error('[Timer] Invalid timestamp:', startTime)
      return
    }
    
    const updateElapsed = () => {
      const now = Date.now()
      const diff = Math.floor((now - start) / 1000) // seconds
      
      // If diff is negative or too large, something is wrong
      if (diff < 0 || diff > 24 * 60 * 60) { // More than 24 hours
        console.error('[Timer] Invalid time difference:', diff, 'seconds')
        setElapsed(0)
        return
      }
      
      setElapsed(diff)
    }

    // Update immediately
    updateElapsed()

    // Then update every second
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime, isActive])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    if (minutes === 0) {
      return `${secs}초`
    } else {
      return `${minutes}분 ${secs}초`
    }
  }

  if (!isActive) return null

  return (
    <span className="text-gray-500 text-xs ml-2">
      {formatTime(elapsed)}
    </span>
  )
}