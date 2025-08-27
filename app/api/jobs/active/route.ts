import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { createJobManager } from '@/lib/jobs/jobManager'

export async function GET(request: NextRequest) {
  try {
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
    
    // Get user's active jobs
    const jobs = await jobManager.getUserActiveJobs(user.id)

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Error fetching active jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}