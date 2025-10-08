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
