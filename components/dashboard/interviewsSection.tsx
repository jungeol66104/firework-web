"use client"

import { useState, useEffect } from "react"
import { CreateInterviewButton } from "@/components/createInterviewButton"
import { InterviewDataTable } from "./interviewsDataTable"
import { Interview } from "@/utils/types"
import { getCurrentUserInterviewsClient } from "@/utils/supabase/services/clientServices"
import { createClient } from "@/utils/supabase/clients/client"
import { useInterviews, useInterviewLoading, useStore } from "@/utils/zustand"

export default function InterviewsSection() {
  // Get state from Zustand store
  const interviews = useInterviews()
  const isLoading = useInterviewLoading()
  const setInterviews = useStore((state) => state.setInterviews)
  const setLoading = useStore((state) => state.setLoading)
  const addInterview = useStore((state) => state.addInterview)
  const removeInterview = useStore((state) => state.removeInterview)
  
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return
      
      try {
        setLoading(true)
        // Fetch current user's interviews
        const result = await getCurrentUserInterviewsClient({ limit: 50 })
        setInterviews(result.interviews)
      } catch (error) {
        console.error('Error fetching data:', error)
        setInterviews([])
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId, setInterviews, setLoading])

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

  return (
    <div id="interviews" className="w-full max-w-4xl p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">면접 내역</h1>
        <CreateInterviewButton onInterviewCreated={handleInterviewCreated} className="bg-white text-black border border-gray-300 hover:bg-gray-50" size="sm"/>
      </div>
      <InterviewDataTable 
        data={interviews} 
        setData={handleSetData}
        isLoading={isLoading}
        userId={userId}
        handleInterviewCreated={handleInterviewCreated}
        handleInterviewDeleted={handleInterviewDeleted}
      />
    </div>
  )
} 