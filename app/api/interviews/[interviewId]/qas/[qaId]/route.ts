import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string, qaId: string }> }
) {
  try {
    const { interviewId, qaId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the specific QA record
    const { data: qa, error } = await supabase
      .from('interview_qas')
      .select('*')
      .eq('id', qaId)
      .eq('interview_id', interviewId)
      .single()

    if (error) {
      console.error('Error fetching QA record:', error)
      return NextResponse.json({ error: 'Failed to fetch QA record' }, { status: 500 })
    }

    // Verify the interview belongs to the user
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('user_id')
      .eq('id', interviewId)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (interview.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ qa })
  } catch (error) {
    console.error('Error in QA fetch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string, qaId: string }> }
) {
  try {
    const { interviewId, qaId } = await params
    const body = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the interview belongs to the user
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('user_id')
      .eq('id', interviewId)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (interview.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle setAsDefault request
    if (body.setAsDefault === true) {
      // First, set all other QAs for this interview to is_default = false
      await supabase
        .from('interview_qas')
        .update({ is_default: false })
        .eq('interview_id', interviewId)

      // Then set this QA to is_default = true
      const { error: updateError } = await supabase
        .from('interview_qas')
        .update({ is_default: true })
        .eq('id', qaId)
        .eq('interview_id', interviewId)

      if (updateError) {
        console.error('Error setting default:', updateError)
        return NextResponse.json({ error: 'Failed to set default' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // Handle rename request
    if (body.name) {
      const { error: updateError } = await supabase
        .from('interview_qas')
        .update({ name: body.name })
        .eq('id', qaId)
        .eq('interview_id', interviewId)

      if (updateError) {
        console.error('Error renaming:', updateError)
        return NextResponse.json({ error: 'Failed to rename' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error) {
    console.error('Error in QA update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
