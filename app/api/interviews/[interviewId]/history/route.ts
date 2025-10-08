import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'

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

    // Fetch all QA history for this interview
    const { data: history, error: historyError } = await supabase
      .from('interview_qas')
      .select('id, name, type, is_default, created_at')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching QA history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({ history: history || [] })

  } catch (error) {
    console.error('Error in history endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
