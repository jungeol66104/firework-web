import { createClient } from "@/lib/supabase/clients/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: interviews, error } = await supabase
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching latest interview:', error)
      return Response.json({ error: 'Failed to fetch latest interview' }, { status: 500 })
    }

    if (!interviews) {
      return Response.json({ error: 'No interviews found' }, { status: 404 })
    }

    return Response.json(interviews)
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}