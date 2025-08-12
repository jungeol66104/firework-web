import { SupabaseClient } from '@supabase/supabase-js'
import { Interview, FetchInterviewsParams, FetchInterviewsResult, CreateInterviewParams, Profile, CreateProfileParams } from '@/utils/types'

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
    question_text: string
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
    question_text?: string
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
    answer_text: string
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
    answer_text?: string
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
  const { error } = await supabase
    .from('interview_answers')
    .delete()
    .eq('id', answerId)

  if (error) {
    throw new Error(`Failed to delete interview answer: ${error.message}`)
  }
}
