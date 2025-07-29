import { createClient } from '../serverClient'
import { fetchInterviews, FetchInterviewsParams, FetchInterviewsResult } from './services'

export async function fetchInterviewsServer(
  params: FetchInterviewsParams = {}
): Promise<FetchInterviewsResult> {
  const supabase = await createClient()
  return fetchInterviews(supabase, params)
}
