import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { createInterview } from '@/lib/supabase/services/services'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { company_name, position } = body

    if (!company_name || !position) {
      return NextResponse.json(
        { error: 'Company name and position are required' },
        { status: 400 }
      )
    }

    // Create interview
    const interview = await createInterview(supabase, {
      company_name,
      position,
      user_id: user.id,
    })

    return NextResponse.json(interview)
  } catch (error) {
    console.error('Error in POST /api/interviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
