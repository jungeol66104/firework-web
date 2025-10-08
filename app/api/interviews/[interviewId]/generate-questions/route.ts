import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { Client } from '@upstash/qstash'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { interviewId } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify interview belongs to user
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id, user_id')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Create a generation job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: user.id,
        job_type: 'questions',
        status: 'queued',
        metadata: {
          interview_id: interviewId
        }
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Error creating job:', jobError)
      return NextResponse.json({ error: 'Failed to create generation job' }, { status: 500 })
    }

    // Queue the job with QStash
    const qstashClient = new Client({
      token: process.env.QSTASH_TOKEN!
    })

    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/process/question`

    try {
      await qstashClient.publishJSON({
        url: callbackUrl,
        body: {
          jobId: job.id,
          userId: user.id,
          interviewId: interviewId
        }
      })

      console.log('Question generation job queued:', job.id)
      return NextResponse.json({ success: true, jobId: job.id })

    } catch (qstashError) {
      console.error('QStash error:', qstashError)

      // Mark job as failed
      await supabase
        .from('generation_jobs')
        .update({ status: 'failed', error_message: 'Failed to queue job' })
        .eq('id', job.id)

      return NextResponse.json({ error: 'Failed to queue generation job' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in generate-questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
