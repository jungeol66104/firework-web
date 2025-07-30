"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/ui/data-table"
import { Interview } from "@/lib/types"
import createTestColumns from "@/components/testColumns"
import { deleteInterviewClient, searchInterviewsByCandidateNameClient, fetchInterviewsClient } from "@/lib/supabase/services/clientServices"

export function InterviewDataTable() {
  const router = useRouter()
  const [data, setData] = useState<Interview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const interviews = await fetchInterviewsClient({ limit: 50 })
        setData(interviews)
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteInterviewClient(id)
      // Update local state immediately
      setData(prevData => prevData.filter(interview => interview.id !== id))
    } catch (error) {
      console.error('Error deleting interview:', error)
      // Optionally show error message to user
    }
  }

  const handleInterviewCreated = (newInterview: Interview) => {
    // Add the new interview to the beginning of the list
    setData(prevData => [newInterview, ...prevData])
  }

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      // If search is cleared, fetch all interviews again
      // Only show loading for initial data fetch, not for search
      try {
        const interviews = await fetchInterviewsClient({ limit: 50 })
        setData(interviews)
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setData([])
      }
      return
    }

    // Don't set loading state for search - keep table visible
    try {
      const interviews = await searchInterviewsByCandidateNameClient(searchTerm, 50)
      setData(interviews)
    } catch (error) {
      console.error('Error searching interviews:', error)
      setData([])
    }
  }, [])

  const handleSearch = useCallback((searchTerm: string) => {
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // If search term is empty, immediately fetch all data
    if (!searchTerm.trim()) {
      performSearch('')
      return
    }

    // Set a new timeout for the search
    const timeout = setTimeout(() => {
      performSearch(searchTerm)
    }, 300) // 300ms debounce delay

    setSearchTimeout(timeout)
  }, [searchTimeout, performSearch])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  // Create columns with router and delete handler
  const columns = createTestColumns(router, handleDelete)

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="지원자명으로 검색..."
      emptyMessage="현재 데이터베이스에 면접 기록이 없습니다. 새로운 면접을 생성해보세요."
      showCreateButton={true}
      isLoading={isLoading}
      onSearch={handleSearch}
      onInterviewCreated={handleInterviewCreated}
    />
  )
} 