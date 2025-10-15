import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { createReport, fetchCurrentUserReports } from '@/lib/supabase/services/services'

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
    const { interview_qas_id, selectedQuestions, selectedAnswers, description } = body

    if (!interview_qas_id) {
      return NextResponse.json(
        { error: 'interview_qas_id is required' },
        { status: 400 }
      )
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if ((!selectedQuestions || selectedQuestions.length === 0) &&
        (!selectedAnswers || selectedAnswers.length === 0)) {
      return NextResponse.json(
        { error: 'At least one question or answer must be selected' },
        { status: 400 }
      )
    }

    // Create report
    const report = await createReport(supabase, {
      interview_qas_id,
      selectedQuestions: selectedQuestions || [],
      selectedAnswers: selectedAnswers || [],
      description: description.trim()
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error in POST /api/reports:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Fetch current user's reports
    const reports = await fetchCurrentUserReports(supabase)

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error in GET /api/reports:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
