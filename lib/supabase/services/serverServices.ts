import { createClient } from '../serverClient'
import { fetchInterviews } from './services'
import { FetchInterviewsParams, FetchInterviewsResult } from '@/lib/types'

export async function fetchInterviewsServer(
  params: FetchInterviewsParams = {}
): Promise<FetchInterviewsResult> {
  const supabase = await createClient()
  return fetchInterviews(supabase, params)
}
