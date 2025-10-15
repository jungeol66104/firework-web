import { SupabaseClient } from '@supabase/supabase-js'
import { Interview, FetchInterviewsParams, FetchInterviewsResult, CreateInterviewParams, Profile, CreateProfileParams, Report, CreateReportParams, UpdateReportParams } from '@/lib/types'
import { addTokens } from './tokenService'

export async function fetchInterviews(supabase: SupabaseClient, params: FetchInterviewsParams = {}): Promise<FetchInterviewsResult> {
  const { limit = 10, cursor, orderBy = 'created_at', orderDirection = 'desc', user_id } = params

  let query = supabase
    .from('interviews')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1) // Fetch one extra to determine if there are more

  // Filter by user_id if provided
  if (user_id) {
    query = query.eq('user_id', user_id)
  }

  if (cursor) {
    const operator = orderDirection === 'asc' ? 'gt' : 'lt'
    query = query.filter(orderBy, operator, cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch interviews: ${error.message}`)
  }

  const interviews = data || []
  const hasMore = interviews.length > limit
  const nextCursor = hasMore ? interviews[limit - 1][orderBy] : undefined

  return {
    interviews: hasMore ? interviews.slice(0, limit) : interviews,
    nextCursor,
    hasMore
  }
}

export async function createInterview(supabase: SupabaseClient, params: CreateInterviewParams): Promise<Interview> {
  console.log("createInterview called with params:", params)
  
  // Ensure user_id is provided
  if (!params.user_id) {
    throw new Error('user_id is required to create an interview')
  }
  
  const { data, error } = await supabase
    .from('interviews')
    .insert([params])
    .select()
    .single()

  console.log("Supabase response - data:", data, "error:", error)

  if (error) {
    console.error("Supabase error:", error)
    throw new Error(`Failed to create interview: ${error.message}`)
  }

  console.log("Interview created successfully:", data)
  return data
}

export async function deleteInterview(
  supabase: SupabaseClient,
  interviewId: string,
  user_id?: string
): Promise<void> {
  console.log("deleteInterview called with id:", interviewId)
  
  let query = supabase
    .from('interviews')
    .delete()
    .eq('id', interviewId)

  // If user_id is provided, ensure the interview belongs to the user
  if (user_id) {
    query = query.eq('user_id', user_id)
  }

  const { error } = await query

  console.log("Supabase delete response - error:", error)

  if (error) {
    console.error("Supabase delete error:", error)
    throw new Error(`Failed to delete interview: ${error.message}`)
  }

  console.log("Interview deleted successfully")
}

export async function searchInterviewsByCandidateName(
  supabase: SupabaseClient,
  candidateName: string,
  limit: number = 10,
  user_id?: string
): Promise<Interview[]> {
  console.log("searchInterviewsByCandidateName called with candidateName:", candidateName)
  
  let query = supabase
    .from('interviews')
    .select('*')
    .ilike('candidate_name', `%${candidateName}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Filter by user_id if provided
  if (user_id) {
    query = query.eq('user_id', user_id)
  }

  const { data, error } = await query

  console.log("Supabase search response - data:", data, "error:", error)

  if (error) {
    console.error("Supabase search error:", error)
    throw new Error(`Failed to search interviews: ${error.message}`)
  }

  console.log("Interviews found:", data?.length || 0)
  return data || []
}

export async function fetchInterviewById(supabase: SupabaseClient, interviewId: string, user_id?: string): Promise<Interview | null> {
  let query = supabase
    .from('interviews')
    .select('*')
    .eq('id', interviewId)

  // If user_id is provided, ensure the interview belongs to the user
  if (user_id) {
    query = query.eq('user_id', user_id)
  }

  const { data, error } = await query.single()
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch interview: ${error.message}`);
  }
  return data;
}

// Profile service functions
export async function createProfile(supabase: SupabaseClient, params: CreateProfileParams): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert([params])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`)
  }

  return data
}

export async function fetchProfileById(supabase: SupabaseClient, profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }

  return data
}

export async function updateProfile(supabase: SupabaseClient, profileId: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return data
}

// New function to fetch interviews for a specific user
export async function fetchUserInterviews(supabase: SupabaseClient, user_id: string, params: Omit<FetchInterviewsParams, 'user_id'> = {}): Promise<FetchInterviewsResult> {
  return fetchInterviews(supabase, { ...params, user_id })
}

// New function to get current user's interviews
export async function getCurrentUserInterviews(supabase: SupabaseClient, params: Omit<FetchInterviewsParams, 'user_id'> = {}): Promise<FetchInterviewsResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }
  
  return fetchUserInterviews(supabase, user.id, params)
}

// New function to get current user
export async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(`Failed to get current user: ${error.message}`)
  }
  
  return user
}

// New function to check if user owns an interview
export async function checkInterviewOwnership(supabase: SupabaseClient, interviewId: string, user_id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('interviews')
    .select('id')
    .eq('id', interviewId)
    .eq('user_id', user_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return false; // Not found
    throw new Error(`Failed to check interview ownership: ${error.message}`)
  }

  return !!data
}

// New function to update interview (with ownership check)
export async function updateInterview(
  supabase: SupabaseClient,
  interviewId: string,
  updates: Partial<Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'user_id'>>,
  user_id?: string
): Promise<Interview> {
  let query = supabase
    .from('interviews')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', interviewId)

  // If user_id is provided, ensure the interview belongs to the user
  if (user_id) {
    query = query.eq('user_id', user_id)
  }

  const { data, error } = await query.select().single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Interview not found or access denied')
    }
    throw new Error(`Failed to update interview: ${error.message}`)
  }

  return data
}

// Profile management functions
export async function getCurrentUserProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  return fetchProfileById(supabase, user.id)
}

export async function updateCurrentUserProfile(supabase: SupabaseClient, updates: { name?: string }): Promise<Profile> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }
  
  return updateProfile(supabase, user.id, updates)
}

export async function deleteCurrentUserAccount(supabase: SupabaseClient): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  // First, delete all user's interviews
  const { error: interviewsError } = await supabase
    .from('interviews')
    .delete()
    .eq('user_id', user.id)

  if (interviewsError) {
    throw new Error(`Failed to delete user interviews: ${interviewsError.message}`)
  }

  // Then, delete the user's profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id)

  if (profileError) {
    throw new Error(`Failed to delete user profile: ${profileError.message}`)
  }

  // Try to delete the user account using the built-in method
  // This should work if the user is deleting their own account
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    // If admin deletion fails, fall back to just signing out
    console.warn('Could not delete user account, signing out instead:', deleteError.message)
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      throw new Error(`Failed to sign out user: ${signOutError.message}`)
    }
    
    throw new Error('User data deleted but account deletion requires admin privileges. Please contact support to complete account deletion.')
  }
}

// Interview Questions service functions
export async function fetchInterviewQuestions(
  supabase: SupabaseClient,
  interviewId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('interview_questions')
    .select('*')
    .eq('interview_id', interviewId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch interview questions: ${error.message}`)
  }

  return data || []
}

export async function createInterviewQuestion(
  supabase: SupabaseClient,
  params: {
    interview_id: string
    question_data: any
    comment?: string
  }
): Promise<any> {
  const { data, error } = await supabase
    .from('interview_questions')
    .insert([params])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create interview question: ${error.message}`)
  }

  return data
}

export async function updateInterviewQuestion(
  supabase: SupabaseClient,
  questionId: string,
  updates: {
    question_data?: any
    comment?: string
  }
): Promise<any> {
  const { data, error } = await supabase
    .from('interview_questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update interview question: ${error.message}`)
  }

  return data
}

export async function deleteInterviewQuestion(
  supabase: SupabaseClient,
  questionId: string
): Promise<void> {
  // First, delete any generation jobs that reference this question
  const { error: jobDeleteError } = await supabase
    .from('generation_jobs')
    .delete()
    .eq('question_id', questionId)

  if (jobDeleteError) {
    throw new Error(`Failed to delete related generation jobs: ${jobDeleteError.message}`)
  }

  // Then delete the question itself
  const { error } = await supabase
    .from('interview_questions')
    .delete()
    .eq('id', questionId)

  if (error) {
    throw new Error(`Failed to delete interview question: ${error.message}`)
  }
}

// Interview Answers service functions
export async function fetchInterviewAnswers(
  supabase: SupabaseClient,
  interviewId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('interview_answers')
    .select('*')
    .eq('interview_id', interviewId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch interview answers: ${error.message}`)
  }

  return data || []
}

export async function createInterviewAnswer(
  supabase: SupabaseClient,
  params: {
    interview_id: string
    question_id: string
    answer_data: any
    comment?: string
  }
): Promise<any> {
  const { data, error } = await supabase
    .from('interview_answers')
    .insert([params])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create interview answer: ${error.message}`)
  }

  return data
}

export async function updateInterviewAnswer(
  supabase: SupabaseClient,
  answerId: string,
  updates: {
    answer_data?: any
    comment?: string
  }
): Promise<any> {
  const { data, error } = await supabase
    .from('interview_answers')
    .update(updates)
    .eq('id', answerId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update interview answer: ${error.message}`)
  }

  return data
}

export async function deleteInterviewAnswer(
  supabase: SupabaseClient,
  answerId: string
): Promise<void> {
  // Get the question_id associated with this answer first
  const { data: answerData, error: fetchError } = await supabase
    .from('interview_answers')
    .select('question_id')
    .eq('id', answerId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch answer details: ${fetchError.message}`)
  }

  // Delete any generation jobs that were used to create answers for this specific question
  // (Answer generation jobs reference the question_id, not the answer_id)
  if (answerData?.question_id) {
    const { error: jobDeleteError } = await supabase
      .from('generation_jobs')
      .delete()
      .eq('question_id', answerData.question_id)
      .eq('type', 'answer')

    if (jobDeleteError) {
      throw new Error(`Failed to delete related generation jobs: ${jobDeleteError.message}`)
    }
  }

  // Then delete the answer itself
  const { error } = await supabase
    .from('interview_answers')
    .delete()
    .eq('id', answerId)

  if (error) {
    throw new Error(`Failed to delete interview answer: ${error.message}`)
  }
}

// Report service functions
export async function createReport(
  supabase: SupabaseClient,
  params: CreateReportParams
): Promise<Report> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  // Get interview_id from interview_qas
  const { data: qaData, error: qaError } = await supabase
    .from('interview_qas')
    .select('interview_id')
    .eq('id', params.interview_qas_id)
    .single()

  if (qaError || !qaData) {
    throw new Error('Interview Q&A not found')
  }

  // Fetch the actual Q&A data to validate content exists
  const { data: qaRecord, error: qaRecordError } = await supabase
    .from('interview_qas')
    .select('questions_data, answers_data')
    .eq('id', params.interview_qas_id)
    .single()

  if (qaRecordError || !qaRecord) {
    throw new Error('Failed to fetch Q&A data for validation')
  }

  // Parse selected items to create items structure
  const items: Report['items'] = {
    questions: [],
    answers: []
  }

  // Parse selected questions - VALIDATE content exists
  params.selectedQuestions.forEach(itemId => {
    const match = itemId.match(/^(.+)_q_(\d+)$/)
    if (match) {
      const category = match[1]
      const index = parseInt(match[2])

      // Validate that the question actually has content
      const questionContent = qaRecord.questions_data?.[category]?.[index]
      if (questionContent && typeof questionContent === 'string' && questionContent.trim().length > 0) {
        items.questions.push({
          category,
          index
        })
      } else {
        console.warn(`Skipping empty question at ${category}[${index}]`)
      }
    }
  })

  // Parse selected answers - VALIDATE content exists
  params.selectedAnswers.forEach(itemId => {
    const match = itemId.match(/^(.+)_a_(\d+)$/)
    if (match) {
      const category = match[1]
      const index = parseInt(match[2])

      // Validate that the answer actually has content
      const answerContent = qaRecord.answers_data?.[category]?.[index]
      if (answerContent && typeof answerContent === 'string' && answerContent.trim().length > 0) {
        items.answers.push({
          category,
          index
        })
      } else {
        console.warn(`Skipping empty answer at ${category}[${index}]`)
      }
    }
  })

  // Ensure at least one valid item after validation
  if (items.questions.length === 0 && items.answers.length === 0) {
    throw new Error('No valid items to report. All selected items appear to be empty.')
  }

  const { data, error } = await supabase
    .from('reports')
    .insert([{
      user_id: user.id,
      interview_id: qaData.interview_id,
      interview_qas_id: params.interview_qas_id,
      items,
      description: params.description,
      status: 'pending'
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`)
  }

  return data
}

export async function fetchReportsByUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`)
  }

  return data || []
}

export async function fetchCurrentUserReports(
  supabase: SupabaseClient
): Promise<Report[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  return fetchReportsByUser(supabase, user.id)
}

export async function fetchReportById(
  supabase: SupabaseClient,
  reportId: string
): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch report: ${error.message}`)
  }

  return data
}

export async function updateReport(
  supabase: SupabaseClient,
  reportId: string,
  updates: UpdateReportParams
): Promise<Report> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  // If status is being set to 'resolved', add resolved_at timestamp
  if (updates.status === 'resolved') {
    updateData.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update report: ${error.message}`)
  }

  return data
}

export async function fetchAllReports(
  supabase: SupabaseClient,
  status?: string
): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`)
  }

  return data || []
}

export async function refundReportItem(
  supabase: SupabaseClient,
  reportId: string,
  itemType: 'question' | 'answer',
  category: string,
  index: number
): Promise<Report> {
  // Fetch the report
  const report = await fetchReportById(supabase, reportId)
  
  if (!report) {
    throw new Error('Report not found')
  }

  // Calculate refund amount
  const refundAmount = itemType === 'question' ? 0.1 : 0.2

  // Update the items to mark as refunded
  const items = { ...report.items }
  const itemsArray = itemType === 'question' ? items.questions : items.answers
  const itemIndex = itemsArray.findIndex(
    item => item.category === category && item.index === index
  )

  if (itemIndex === -1) {
    throw new Error('Item not found in report')
  }

  if (itemsArray[itemIndex].refunded) {
    throw new Error('Item already refunded')
  }

  itemsArray[itemIndex] = {
    ...itemsArray[itemIndex],
    refunded: true,
    refund_amount: refundAmount,
    refunded_at: new Date().toISOString()
  }

  // Update the report
  const { data, error } = await supabase
    .from('reports')
    .update({
      items,
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update report: ${error.message}`)
  }

  // Add tokens back to user
  await addTokens(supabase, report.user_id, refundAmount)

  return data
}
