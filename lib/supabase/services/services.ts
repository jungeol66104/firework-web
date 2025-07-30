import { SupabaseClient } from '@supabase/supabase-js'
import { Interview, FetchInterviewsParams, FetchInterviewsResult, CreateInterviewParams } from '@/lib/types'

export async function fetchInterviews(supabase: SupabaseClient, params: FetchInterviewsParams = {}): Promise<FetchInterviewsResult> {
  const { limit = 10, cursor, orderBy = 'created_at', orderDirection = 'desc' } = params

  let query = supabase
    .from('interviews')
    .select('*')
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1) // Fetch one extra to determine if there are more

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
  interviewId: string
): Promise<void> {
  console.log("deleteInterview called with id:", interviewId)
  
  const { error } = await supabase
    .from('interviews')
    .delete()
    .eq('id', interviewId)

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
  limit: number = 10
): Promise<Interview[]> {
  console.log("searchInterviewsByCandidateName called with candidateName:", candidateName)
  
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .ilike('candidate_name', `%${candidateName}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  console.log("Supabase search response - data:", data, "error:", error)

  if (error) {
    console.error("Supabase search error:", error)
    throw new Error(`Failed to search interviews: ${error.message}`)
  }

  console.log("Interviews found:", data?.length || 0)
  return data || []
}

export async function fetchInterviewById(supabase: SupabaseClient, interviewId: string): Promise<Interview | null> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', interviewId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch interview: ${error.message}`);
  }
  return data;
}
