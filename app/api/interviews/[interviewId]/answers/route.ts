import { createClient } from "@/lib/supabase/clients/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { interviewId } = await params

    // SECURITY: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Verify interview ownership
    const { data: interview, error: ownershipError } = await supabase
      .from('interviews')
      .select('id')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single()

    if (ownershipError || !interview) {
      return Response.json({ error: 'Interview not found or access denied' }, { status: 404 })
    }

    // Fetch QA data (user is now verified as owner)
    const { data: qas, error } = await supabase
      .from('interview_qas')
      .select('*')
      .eq('interview_id', interviewId)
      .eq('is_default', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching QA data:', error)
      return Response.json({ error: 'Failed to fetch QA data' }, { status: 500 })
    }

    // Return answers_data with ID for report tracking
    if (qas && qas.length > 0 && qas[0].answers_data) {
      return Response.json([{
        id: qas[0].id,
        answer_data: qas[0].answers_data
      }])
    }

    return Response.json([])
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}