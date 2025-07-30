"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/ui/data-table"
import { Interview } from "@/lib/types"
import createColumns from "@/components/columns"
import { deleteInterviewClient, searchInterviewsByCandidateNameClient } from "@/lib/supabase/services/clientServices"

interface ComparisonDataTableProps {
  data: Interview[]
}

export function ComparisonDataTable({ data: initialData }: ComparisonDataTableProps) {
  const router = useRouter()
  const [data, setData] = useState<Interview[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleDelete = async (id: string) => {
    await deleteInterviewClient(id)
    // Refresh the page to update the data
    router.refresh()
  }

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setData(initialData)
      return
    }

    setIsLoading(true)
    try {
      const interviews = await searchInterviewsByCandidateNameClient(searchTerm, 50)
      setData(interviews)
    } catch (error) {
      console.error('Error searching interviews:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [initialData])

  const handleSearch = useCallback((searchTerm: string) => {
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // If search term is empty, immediately show original data
    if (!searchTerm.trim()) {
      setData(initialData)
      return
    }

    // Set a new timeout for the search
    const timeout = setTimeout(() => {
      performSearch(searchTerm)
    }, 300) // 300ms debounce delay

    setSearchTimeout(timeout)
  }, [searchTimeout, performSearch, initialData])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  // Create columns with router
  const columns = createColumns(router)

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="지원자명으로 검색..."
      emptyMessage="현재 데이터베이스에 면접 기록이 없습니다. 새로운 면접을 생성해보세요."
      showCreateButton={true}
      onSearch={handleSearch}
    />
  )
} 