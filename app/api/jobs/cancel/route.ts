import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { createJobManager } from '@/lib/jobs/jobManager'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const jobManager = createJobManager(supabase)
    
    // Verify the job belongs to the user
    const job = await jobManager.getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this job' },
        { status: 403 }
      )
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json(
        { error: 'Job is already finished' },
        { status: 400 }
      )
    }

    // Cancel the job
    await jobManager.cancelJob(jobId)

    console.log(`Job ${jobId} cancelled by user ${user.id}`)
    return NextResponse.json({ success: true, message: 'Job cancelled successfully' })

  } catch (error) {
    console.error('Error cancelling job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}