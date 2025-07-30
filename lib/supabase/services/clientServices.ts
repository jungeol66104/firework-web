import { createClient } from '../clientClient'
import { createInterview, deleteInterview, searchInterviewsByCandidateName, fetchInterviewById, fetchInterviews } from './services'
import { CreateInterviewParams, Interview, FetchInterviewsParams } from '@/lib/types'

export async function createInterviewClient(
  params: CreateInterviewParams
): Promise<Interview> {
  console.log("createInterviewClient called with params:", params)
  const supabase = createClient()
  console.log("Supabase client created")
  const result = await createInterview(supabase, params)
  console.log("createInterview result:", result)
  return result
}

export async function deleteInterviewClient(
  interviewId: string
): Promise<void> {
  console.log("deleteInterviewClient called with id:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for delete")
  await deleteInterview(supabase, interviewId)
  console.log("deleteInterview completed")
}

export async function searchInterviewsByCandidateNameClient(
  candidateName: string,
  limit: number = 10
): Promise<Interview[]> {
  console.log("searchInterviewsByCandidateNameClient called with candidateName:", candidateName)
  const supabase = createClient()
  console.log("Supabase client created for search")
  const result = await searchInterviewsByCandidateName(supabase, candidateName, limit)
  console.log("searchInterviewsByCandidateName result:", result)
  return result
}

export async function fetchInterviewByIdClient(
  interviewId: string
): Promise<Interview | null> {
  console.log("fetchInterviewByIdClient called with id:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for fetch by id")
  const result = await fetchInterviewById(supabase, interviewId)
  console.log("fetchInterviewById result:", result)
  return result
}

export async function fetchInterviewsClient(
  params: FetchInterviewsParams = {}
): Promise<Interview[]> {
  console.log("fetchInterviewsClient called with params:", params)
  const supabase = createClient()
  console.log("Supabase client created for fetch interviews")
  const result = await fetchInterviews(supabase, params)
  console.log("fetchInterviews result:", result)
  return result.interviews
}
