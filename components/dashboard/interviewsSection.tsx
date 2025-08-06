"use client"

import { useState, useEffect } from "react"
import { CreateInterviewButton } from "@/components/createInterviewButton"
import { InterviewDataTable } from "./interviewDataTable"
import { Interview } from "@/utils/types"
import { getCurrentUserInterviewsClient } from "@/utils/supabase/services/clientServices"
import { createClient } from "@/utils/supabase/clients/client"

export default function InterviewsSection() {
  const [data, setData] = useState<Interview[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
        // Fetch current user's interviews
        const result = await getCurrentUserInterviewsClient({ limit: 50 })
        setData(result.interviews)
      } catch (error) {
        console.error('Error fetching data:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId])

  const handleInterviewCreated = (newInterview: Interview) => {
    // Add the new interview to the beginning of the list
    setData(prevData => [newInterview, ...prevData])
  }

  const handleInterviewDeleted = (deletedId: string) => {
    // Remove the deleted interview from the list
    setData(prevData => prevData.filter(interview => interview.id !== deletedId))
  }

  return (
    <div id="interviews" className="w-full max-w-4xl p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">면접 내역</h1>
        <CreateInterviewButton onInterviewCreated={handleInterviewCreated} className="bg-white text-black border border-gray-300 hover:bg-gray-50" size="sm"/>
      </div>
      <InterviewDataTable 
        data={data} 
        setData={setData}
        isLoading={isLoading}
        userId={userId}
        handleInterviewCreated={handleInterviewCreated}
        handleInterviewDeleted={handleInterviewDeleted}
      />
    </div>
  )
} 