import { createClient } from '../serverClient'
import { fetchInterviews } from './services'
import { FetchInterviewsParams, FetchInterviewsResult } from '@/lib/types'
import { fetchInterviewById } from './services'

export async function fetchInterviewsServer(params: FetchInterviewsParams = {}): Promise<FetchInterviewsResult> {
  const supabase = await createClient()
  return fetchInterviews(supabase, params)
}

export async function fetchInterviewByIdServer(interviewId: string) {
  const supabase = await createClient();
  return fetchInterviewById(supabase, interviewId);
}
