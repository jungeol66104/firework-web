import { SupabaseClient } from '@supabase/supabase-js'
import { Interview, Profile } from '@/lib/types'

// Admin-specific services (no user_id filtering for cross-user access)


// Fetch all users (profiles with email)
export async function fetchAllUsers(
  supabase: SupabaseClient,
  params: {
    limit?: number
    cursor?: string
    orderBy?: 'created_at' | 'name'
    orderDirection?: 'asc' | 'desc'
  } = {}
): Promise<{
  users: Profile[]
  nextCursor?: string
  hasMore: boolean
}> {
  const { limit = 10, cursor, orderBy = 'created_at', orderDirection = 'desc' } = params

  let query = supabase
    .from('profiles')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1)

  if (cursor) {
    const operator = orderDirection === 'asc' ? 'gt' : 'lt'
    query = query.filter(orderBy, operator, cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  const users = data || []
  const hasMore = users.length > limit
  const nextCursor = hasMore ? users[limit - 1][orderBy] : undefined

  return {
    users: hasMore ? users.slice(0, limit) : users,
    nextCursor,
    hasMore
  }
}

// Fetch all interviews (optionally filtered by user_id)
export async function fetchAllInterviews(
  supabase: SupabaseClient,
  params: {
    limit?: number
    cursor?: string
    orderBy?: 'created_at' | 'updated_at' | 'candidate_name'
    orderDirection?: 'asc' | 'desc'
    user_id?: string
  } = {}
): Promise<{
  interviews: Interview[]
  nextCursor?: string
  hasMore: boolean
}> {
  const { limit = 10, cursor, orderBy = 'created_at', orderDirection = 'desc', user_id } = params

  let query = supabase
    .from('interviews')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1)

  // Filter by user_id if provided (for drill-down from users page)
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

// Fetch all questions (optionally filtered by interview_id)
export async function fetchAllQuestions(
  supabase: SupabaseClient,
  params: {
    limit?: number
    cursor?: string
    orderBy?: 'created_at' | 'updated_at'
    orderDirection?: 'asc' | 'desc'
    interview_id?: string
  } = {}
): Promise<{
  questions: any[]
  nextCursor?: string
  hasMore: boolean
}> {
  const { limit = 10, cursor, orderBy = 'created_at', orderDirection = 'desc', interview_id } = params

  let query = supabase
    .from('interview_questions')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1)

  // Filter by interview_id if provided (for drill-down from interviews page)
  if (interview_id) {
    query = query.eq('interview_id', interview_id)
  }

  if (cursor) {
    const operator = orderDirection === 'asc' ? 'gt' : 'lt'
    query = query.filter(orderBy, operator, cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }

  const questions = data || []
  const hasMore = questions.length > limit
  const nextCursor = hasMore ? questions[limit - 1][orderBy] : undefined

  return {
    questions: hasMore ? questions.slice(0, limit) : questions,
    nextCursor,
    hasMore
  }
}

// Fetch all answers (optionally filtered by question_id)
export async function fetchAllAnswers(
  supabase: SupabaseClient,
  params: {
    limit?: number
    cursor?: string
    orderBy?: 'created_at' | 'updated_at'
    orderDirection?: 'asc' | 'desc'
    question_id?: string
  } = {}
): Promise<{
  answers: any[]
  nextCursor?: string
  hasMore: boolean
}> {
  const { limit = 10, cursor, orderBy = 'created_at', orderDirection = 'desc', question_id } = params

  let query = supabase
    .from('interview_answers')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1)

  // Filter by question_id if provided (for drill-down from questions page)
  if (question_id) {
    query = query.eq('question_id', question_id)
  }

  if (cursor) {
    const operator = orderDirection === 'asc' ? 'gt' : 'lt'
    query = query.filter(orderBy, operator, cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch answers: ${error.message}`)
  }

  const answers = data || []
  const hasMore = answers.length > limit
  const nextCursor = hasMore ? answers[limit - 1][orderBy] : undefined

  return {
    answers: hasMore ? answers.slice(0, limit) : answers,
    nextCursor,
    hasMore
  }
}

// Get user info by ID (for displaying user details)
export async function getUserById(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

// Get interview info by ID (for displaying interview details)
export async function getInterviewById(supabase: SupabaseClient, interviewId: string): Promise<Interview | null> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', interviewId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch interview: ${error.message}`)
  }

  return data
}

// Admin delete operations (for future use)
export async function adminDeleteInterview(supabase: SupabaseClient, interviewId: string): Promise<void> {
  const { error } = await supabase
    .from('interviews')
    .delete()
    .eq('id', interviewId)

  if (error) {
    throw new Error(`Failed to delete interview: ${error.message}`)
  }
}

export async function adminDeleteQuestion(supabase: SupabaseClient, questionId: string): Promise<void> {
  // First delete related answers
  const { error: answersError } = await supabase
    .from('interview_answers')
    .delete()
    .eq('question_id', questionId)

  if (answersError) {
    throw new Error(`Failed to delete related answers: ${answersError.message}`)
  }

  // Then delete the question
  const { error } = await supabase
    .from('interview_questions')
    .delete()
    .eq('id', questionId)

  if (error) {
    throw new Error(`Failed to delete question: ${error.message}`)
  }
}