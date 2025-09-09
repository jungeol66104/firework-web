import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { fetchInterviewByIdServer } from '@/lib/supabase/services/serverServices'
import { getUserTokens } from '@/lib/supabase/services/tokenService'
import { createJobManager } from '@/lib/jobs/jobManager'
import { createQueueManager } from '@/lib/jobs/queueManager'

export async function POST(request: NextRequest) {
  try {
    const { interviewId, comment, questionId } = await request.json()
    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      )
    }

    // Get the current user from the request
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch the interview data
    const interview = await fetchInterviewByIdServer(interviewId, user.id)
    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    // Check if user has sufficient tokens (3 tokens for question generation)
    const tokens = await getUserTokens(supabase, user.id)
    if (tokens < 3) {
      return NextResponse.json(
        { error: 'Insufficient tokens', tokens: tokens },
        { status: 402 }
      )
    }

    // Check if user already has any active generation job
    const jobManager = createJobManager(supabase)
    const activeJob = await jobManager.getAnyActiveJobForUser(user.id)
    if (activeJob) {
      const jobTypeText = activeJob.type === 'question' ? '질문' : '답변'
      return NextResponse.json(
        { 
          error: `이미 ${jobTypeText} 생성이 진행 중입니다. 한 번에 하나의 생성 작업만 실행할 수 있습니다.`,
          activeJob: {
            id: activeJob.id,
            type: activeJob.type,
            status: activeJob.status,
            created_at: activeJob.created_at
          }
        },
        { status: 409 }
      )
    }

    // Create a background job for question generation
    const job = await jobManager.createJob({
      user_id: user.id,
      interview_id: interviewId,
      type: 'question',
      comment: comment || undefined
    })

    // Queue the job for background processing
    const queueManager = createQueueManager()
    await queueManager.queueQuestionGeneration({
      jobId: job.id,
      type: 'question',
      userId: user.id,
      interviewId: interviewId,
      comment: comment || undefined
    })

    console.log('Question generation job queued:', job.id)
    return NextResponse.json({
      jobId: job.id,
      createdAt: job.created_at || new Date().toISOString(),
      success: true,
      message: 'Question generation started'
    })

  } catch (error) {
    console.error('Error queueing question generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
