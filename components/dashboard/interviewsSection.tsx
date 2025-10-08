/**
 * @deprecated This component is deprecated and no longer used in the dashboard.
 * Interview list functionality has been moved to /interview page with dropdown selector.
 * Kept in codebase for reference only.
 *
 * Previous usage: Dashboard interview list section
 * Replaced by: Interview dropdown in /interview page
 * Date deprecated: 2025-10-08
 */

"use client"

import { useState, useEffect } from "react"
import { CreateInterviewButton } from "@/components/createInterviewButton"
import { InterviewDataTable } from "./interviewsDataTable"
import { Interview } from "@/lib/types"
import { getCurrentUserInterviewsClient } from "@/lib/supabase/services/clientServices"
import { createClient } from "@/lib/supabase/clients/client"
import { useInterviews, useInterviewLoading, useStore } from "@/lib/zustand"
import { Loader } from "lucide-react"

export default function InterviewsSection() {
  // Get state from Zustand store
  const interviews = useInterviews()
  const isLoading = useInterviewLoading()
  const setInterviews = useStore((state) => state.setInterviews)
  const setLoading = useStore((state) => state.setLoading)
  const addInterview = useStore((state) => state.addInterview)
  const removeInterview = useStore((state) => state.removeInterview)
  const setCurrentUserId = useStore((state) => state.setCurrentUserId)
  const reset = useStore((state) => state.reset)
  const currentUserId = useStore((state) => state.currentUserId)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Check if Zustand store is hydrated (persisted data loaded)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Get current user and reset store if user changed
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const newUserId = user?.id || null
      
      // If user changed, reset the store
      if (currentUserId && currentUserId !== newUserId) {
        reset()
        setHasInitialized(false)
      }
      
      setUserId(newUserId)
      setCurrentUserId(newUserId)
    }
    getCurrentUser()
  }, [setCurrentUserId, reset, currentUserId])

  // Fetch initial data only if we don't have data and haven't initialized yet
  useEffect(() => {
    const fetchData = async () => {
      if (!userId || hasInitialized || !isHydrated) return
      
      // If we already have interviews data, don't fetch again
      if (interviews.length > 0) {
        setHasInitialized(true)
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        // Fetch current user's interviews
        const result = await getCurrentUserInterviewsClient({ limit: 50 })
        setInterviews(result.interviews)
        setHasInitialized(true)
      } catch (error) {
        console.error('Error fetching data:', error)
        setInterviews([])
        setHasInitialized(true)
      } finally {
        setLoading(false)
      }
    }

    if (userId && isHydrated) {
      fetchData()
    }
  }, [userId, interviews.length, hasInitialized, isHydrated, setInterviews, setLoading])

  const handleInterviewCreated = (newInterview: Interview) => {
    // Add the new interview to the beginning of the list
    addInterview(newInterview)
  }

  const handleInterviewDeleted = (deletedId: string) => {
    // Remove the deleted interview from the list
    removeInterview(deletedId)
  }

  // Wrapper function to work with InterviewDataTable's expected setData prop
  const handleSetData = (value: React.SetStateAction<Interview[]>) => {
    if (typeof value === 'function') {
      const newInterviews = value(interviews)
      setInterviews(newInterviews)
    } else {
      setInterviews(value)
    }
  }

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div id="interviews" className="w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">면접 내역</h1>
          <CreateInterviewButton onInterviewCreated={handleInterviewCreated} className="bg-white text-black border border-gray-300 hover:bg-gray-50" size="sm"/>
        </div>
        <div className="flex justify-center items-center py-4">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div id="interviews" className="w-full max-w-4xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">면접 내역</h1>
        <CreateInterviewButton onInterviewCreated={handleInterviewCreated} className="bg-white text-black border border-gray-300 hover:bg-gray-50" size="sm"/>
      </div>
      <InterviewDataTable 
        data={interviews} 
        setData={handleSetData}
        isLoading={isLoading && !hasInitialized}
        userId={userId}
        handleInterviewCreated={handleInterviewCreated}
        handleInterviewDeleted={handleInterviewDeleted}
      />
    </div>
  )
} 