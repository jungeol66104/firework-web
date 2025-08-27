import { SupabaseClient } from '@supabase/supabase-js'

export interface GenerationJob {
  id: string
  user_id: string
  interview_id: string
  type: 'question' | 'answer'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  question_id?: string  // for answer jobs only
  comment?: string
  result?: any
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface CreateJobParams {
  user_id: string
  interview_id: string
  type: 'question' | 'answer'
  question_id?: string  // required for answer jobs
  comment?: string
}

export interface UpdateJobParams {
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  result?: any
  error_message?: string
  completed_at?: string
}

export class JobManager {
  constructor(private supabase: SupabaseClient) {}

  async createJob(params: CreateJobParams): Promise<GenerationJob> {
    const { data, error } = await this.supabase
      .from('generation_jobs')
      .insert([{
        user_id: params.user_id,
        interview_id: params.interview_id,
        type: params.type,
        question_id: params.question_id,
        comment: params.comment,
        status: 'queued'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating job:', error)
      throw new Error(`Failed to create generation job: ${error.message}`)
    }

    return data
  }

  async getJob(jobId: string): Promise<GenerationJob | null> {
    const { data, error } = await this.supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      return null
    }

    return data
  }

  async updateJob(jobId: string, updates: UpdateJobParams): Promise<GenerationJob> {
    const updateData: any = { ...updates }
    
    // If marking as completed, set completed_at timestamp
    if (updates.status === 'completed' && !updates.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('generation_jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single()

    if (error) {
      console.error('Error updating job:', error)
      throw new Error(`Failed to update job: ${error.message}`)
    }

    return data
  }

  async getUserActiveJobs(userId: string): Promise<GenerationJob[]> {
    const { data, error } = await this.supabase
      .from('generation_jobs')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user active jobs:', error)
      return []
    }

    return data || []
  }

  async getInterviewJobs(interviewId: string): Promise<GenerationJob[]> {
    const { data, error } = await this.supabase
      .from('generation_jobs')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching interview jobs:', error)
      return []
    }

    return data || []
  }

  async hasActiveJob(userId: string, type: 'question' | 'answer'): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('generation_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .in('status', ['queued', 'processing'])
      .limit(1)

    if (error) {
      console.error('Error checking for active jobs:', error)
      return false
    }

    return (data?.length || 0) > 0
  }

  async markJobAsProcessing(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'processing' })
  }

  async markJobAsCompleted(jobId: string, result: any): Promise<void> {
    await this.updateJob(jobId, { 
      status: 'completed', 
      result,
      completed_at: new Date().toISOString()
    })
  }

  async markJobAsFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.updateJob(jobId, { 
      status: 'failed', 
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    })
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { 
      status: 'failed', 
      error_message: 'Cancelled by user',
      completed_at: new Date().toISOString()
    })
  }

  async getActiveJobForUser(userId: string, type: 'question' | 'answer'): Promise<GenerationJob | null> {
    const { data, error } = await this.supabase
      .from('generation_jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return null
    }

    return data
  }

  // Cleanup old completed/failed jobs (call this periodically)
  async cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { error } = await this.supabase
      .from('generation_jobs')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', cutoffDate.toISOString())

    if (error) {
      console.error('Error cleaning up old jobs:', error)
    } else {
      console.log(`Cleaned up jobs older than ${olderThanDays} days`)
    }
  }
}

// Helper function to create job manager instance
export function createJobManager(supabase: SupabaseClient): JobManager {
  return new JobManager(supabase)
}