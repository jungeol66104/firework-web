// Define GenerationJob inline to avoid circular imports
interface GenerationJob {
  id: string
  user_id: string
  interview_id: string
  type: 'question' | 'answer'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  question_id?: string
  comment?: string
  result?: any
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface JobsSlice {
  activeJobs: GenerationJob[]
  isPolling: boolean
  pollingInterval: NodeJS.Timeout | null
  completionCallbacks: Record<string, (job: GenerationJob) => void>
  
  // Actions
  addActiveJob: (job: GenerationJob) => void
  updateJob: (jobId: string, updates: Partial<GenerationJob>) => void
  removeJob: (jobId: string) => void
  setActiveJobs: (jobs: GenerationJob[]) => void
  startPolling: (intervalMs?: number) => void
  stopPolling: () => void
  setPolling: (isPolling: boolean) => void
  hasActiveJob: (type?: 'question' | 'answer') => boolean
  resetJobs: () => void
  setCompletionCallback: (key: string, callback: (job: GenerationJob) => void) => void
  removeCompletionCallback: (key: string) => void
}

export const createJobsSlice = (set: any, get: any): JobsSlice => ({
  activeJobs: [],
  isPolling: false,
  pollingInterval: null,
  completionCallbacks: {},
  
  addActiveJob: (job) => set((state: any) => ({
    activeJobs: [job, ...state.activeJobs]
  })),
  
  updateJob: (jobId, updates) => set((state: any) => ({
    activeJobs: state.activeJobs.map((job: GenerationJob) => 
      job.id === jobId ? { ...job, ...updates } : job
    )
  })),
  
  removeJob: (jobId) => set((state: any) => ({
    activeJobs: state.activeJobs.filter((job: GenerationJob) => job.id !== jobId)
  })),
  
  setActiveJobs: (jobs) => set({ activeJobs: jobs }),
  
  startPolling: (intervalMs = 5000) => {
    const state = get()
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
    }
    
    const interval = setInterval(async () => {
      const currentState = get()
      // Check all jobs, including completed ones (in case they just finished)
      const jobsToCheck = currentState.activeJobs
      
      // Only stop polling when we have no jobs at all
      const pendingJobs = jobsToCheck.filter((job: GenerationJob) => 
        job.status === 'queued' || job.status === 'processing'
      )
      
      if (pendingJobs.length === 0) {
        console.log(`[Polling] No pending jobs remaining, stopping polling`)
        currentState.stopPolling()
        return
      }
      
      console.log(`[Polling] Checking ${jobsToCheck.length} total jobs (${pendingJobs.length} pending):`, jobsToCheck.map((j: GenerationJob) => ({ id: j.id, status: j.status, type: j.type })))
      
      // Poll each job (including completed ones to catch final status updates)
      for (const job of jobsToCheck) {
        try {
          console.log(`[Polling] Fetching status for job ${job.id} (current status: ${job.status})`)
          const response = await fetch(`/api/jobs/${job.id}`)
          if (response.ok) {
            const data = await response.json()
            console.log(`[Polling] Job ${job.id} status updated:`, data.job.status)
            currentState.updateJob(job.id, data.job)
            
            // If job completed or failed, call completion callbacks
            if (data.job.status === 'completed' || data.job.status === 'failed') {
              console.log(`[Polling] Job ${job.id} ${data.job.status}! Calling completion callbacks...`)
              const state = get()
              const callbackCount = Object.keys(state.completionCallbacks).length
              console.log(`[Polling] Found ${callbackCount} completion callbacks`)
              Object.values(state.completionCallbacks).forEach((callback: any) => {
                try {
                  console.log(`[Polling] Calling completion callback for job:`, data.job)
                  callback(data.job)
                } catch (error) {
                  console.error('Error in completion callback:', error)
                }
              })
              
              // Remove completed/failed jobs from activeJobs after callbacks
              console.log(`[Polling] Removing completed job ${job.id} from active jobs`)
              currentState.removeJob(job.id)
            }
          } else {
            console.log(`[Polling] Failed to fetch job ${job.id}:`, response.status, response.statusText)
          }
        } catch (error) {
          console.error('Error polling job status:', error)
        }
      }
    }, intervalMs)
    
    set({ pollingInterval: interval, isPolling: true })
  },
  
  stopPolling: () => {
    const state = get()
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
    }
    set({ pollingInterval: null, isPolling: false })
  },
  
  setPolling: (isPolling) => set({ isPolling }),
  
  hasActiveJob: (type) => {
    const state = get()
    return state.activeJobs.some((job: GenerationJob) => 
      (type ? job.type === type : true) && 
      (job.status === 'queued' || job.status === 'processing')
    )
  },
  
  resetJobs: () => {
    const state = get()
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
    }
    set({ 
      activeJobs: [],
      isPolling: false,
      pollingInterval: null,
      completionCallbacks: {}
    })
  },
  
  setCompletionCallback: (key, callback) => set((state: any) => ({
    completionCallbacks: { ...state.completionCallbacks, [key]: callback }
  })),
  
  removeCompletionCallback: (key) => set((state: any) => {
    const { [key]: removed, ...rest } = state.completionCallbacks
    return { completionCallbacks: rest }
  }),
})