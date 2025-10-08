import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('user_id')
      .eq('id', interviewId)
      .single()

    if (fetchError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    if (interview.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete related records first (cascade delete)
    // Delete interview_qa_jobs
    await supabase
      .from('interview_qa_jobs')
      .delete()
      .eq('interview_id', interviewId)

    // Delete interview_qas
    await supabase
      .from('interview_qas')
      .delete()
      .eq('interview_id', interviewId)

    // Delete the interview
    const { error: deleteError } = await supabase
      .from('interviews')
      .delete()
      .eq('id', interviewId)

    if (deleteError) {
      console.error('Error deleting interview:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete interview' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/interviews/[interviewId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
