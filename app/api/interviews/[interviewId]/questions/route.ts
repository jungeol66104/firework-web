import { createClient } from "@/lib/supabase/clients/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { interviewId } = await params

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

    // Return questions_data in the same format as before
    if (qas && qas.length > 0) {
      return Response.json([{ question_data: qas[0].questions_data }])
    }

    return Response.json([])
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}