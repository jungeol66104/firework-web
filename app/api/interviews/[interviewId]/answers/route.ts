import { createClient } from "@/lib/supabase/clients/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { interviewId } = await params

    const { data: answers, error } = await supabase
      .from('interview_answers')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching answers:', error)
      return Response.json({ error: 'Failed to fetch answers' }, { status: 500 })
    }

    return Response.json(answers || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}