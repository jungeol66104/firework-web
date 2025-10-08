import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { Client } from '@upstash/qstash'
import { getUserTokens } from '@/lib/supabase/services/tokenService'

export async function GET(
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

    // Get default QA
    const { data: qa, error: qaError } = await supabase
      .from('interview_qas')
      .select('*')
      .eq('interview_id', interviewId)
      .eq('is_default', true)
      .single()

    if (qaError && qaError.code !== 'PGRST116') {
      console.error('Error fetching QA:', qaError)
      return NextResponse.json({ error: 'Failed to fetch QA' }, { status: 500 })
    }

    return NextResponse.json({ qa: qa || null })

  } catch (error) {
    console.error('Error in GET QA endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { interviewId } = await params
    const body = await request.json()
    const { type, data = {} } = body

    // Validate type
    const validTypes = [
      'questions_generated',
      'answers_generated',
      'question_regenerated',
      'question_edited',
      'answer_regenerated',
      'answer_edited'
    ]

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid operation type' },
        { status: 400 }
      )
    }

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

    // For answers_generated, check if questions exist
    if (type === 'answers_generated') {
      const { data: defaultQA, error: qaError } = await supabase
        .from('interview_qas')
        .select('id, questions_data')
        .eq('interview_id', interviewId)
        .eq('is_default', true)
        .single()

      if (qaError || !defaultQA || !defaultQA.questions_data) {
        return NextResponse.json(
          { error: 'No questions found. Please generate questions first.' },
          { status: 400 }
        )
      }
    }

    // Calculate required tokens based on operation type
    let requiredTokens = 0

    switch (type) {
      case 'questions_generated':
        requiredTokens = 3
        break
      case 'answers_generated':
        // Calculate based on number of selected questions
        const selectedQuestions = data.selectedQuestions || []
        requiredTokens = (selectedQuestions.length / 30) * 6
        break
      case 'question_regenerated':
      case 'question_edited':
      case 'answer_regenerated':
      case 'answer_edited':
        requiredTokens = 0.2
        break
      default:
        requiredTokens = 0
    }

    // Check if user has enough tokens
    const userTokens = await getUserTokens(supabase, user.id)
    if (userTokens < requiredTokens) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_TOKENS',
          message: `토큰이 부족합니다. 필요한 토큰: ${requiredTokens}, 보유 토큰: ${userTokens}`,
          required: requiredTokens,
          available: userTokens
        },
        { status: 402 } // Payment Required
      )
    }

    // Create a job
    const { data: job, error: jobError } = await supabase
      .from('interview_qa_jobs')
      .insert({
        user_id: user.id,
        interview_id: interviewId,
        type: type,
        status: 'queued',
        input_data: data
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Error creating job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }

    // Queue to QStash
    const qstashClient = new Client({
      token: process.env.QSTASH_TOKEN!
    })

    // Map type to processing endpoint (replace underscore with hyphen)
    const processingEndpoint = type.replace(/_/g, '-')
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/process/${processingEndpoint}`

    try {
      await qstashClient.publishJSON({
        url: callbackUrl,
        body: {
          jobId: job.id,
          userId: user.id,
          interviewId: interviewId,
          inputData: data
        }
      })

      console.log(`Job queued: ${job.id} (${type})`)
      return NextResponse.json({ jobId: job.id })

    } catch (qstashError) {
      console.error('QStash error:', qstashError)

      // Mark job as failed
      await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to queue job'
        })
        .eq('id', job.id)

      return NextResponse.json(
        { error: 'Failed to queue job' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in QA generation endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
