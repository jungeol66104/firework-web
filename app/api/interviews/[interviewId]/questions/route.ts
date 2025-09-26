import { createClient } from "@/lib/supabase/clients/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { interviewId } = await params

    const { data: questions, error } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching questions:', error)
      return Response.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return Response.json(questions || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}