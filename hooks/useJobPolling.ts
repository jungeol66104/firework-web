import { useState, useEffect, useCallback } from 'react'
import { InterviewQAJob } from '@/lib/types'

interface UseJobPollingReturn {
  job: InterviewQAJob | null
  isPolling: boolean
  error: string | null
}

export function useJobPolling(jobId: string | null): UseJobPollingReturn {
  const [job, setJob] = useState<InterviewQAJob | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }

      const data = await response.json()
      setJob(data.job)

      // Stop polling if job is completed or failed
      if (data.job.status === 'completed' || data.job.status === 'failed') {
        setIsPolling(false)
      }
    } catch (err) {
      console.error('Error fetching job:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsPolling(false)
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      setIsPolling(false)
      setError(null)
      return
    }

    // Start polling
    setIsPolling(true)
    setError(null)

    // Initial fetch
    fetchJob()

    // Poll every 2 seconds
    const interval = setInterval(fetchJob, 2000)

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [jobId, fetchJob])

  return { job, isPolling, error }
}
