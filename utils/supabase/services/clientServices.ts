import { createClient } from '../clients/client'
import { createInterview, deleteInterview, searchInterviewsByCandidateName, fetchInterviewById, fetchInterviews, fetchUserInterviews, getCurrentUserInterviews, getCurrentUser, checkInterviewOwnership, updateInterview, getCurrentUserProfile, updateCurrentUserProfile, deleteCurrentUserAccount } from './services'
import { CreateInterviewParams, Interview, FetchInterviewsParams, FetchInterviewsResult } from '@/utils/types'

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
  interviewId: string,
  user_id?: string
): Promise<void> {
  console.log("deleteInterviewClient called with id:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for delete")
  await deleteInterview(supabase, interviewId, user_id)
  console.log("deleteInterview completed")
}

export async function searchInterviewsByCandidateNameClient(
  candidateName: string,
  limit: number = 10,
  user_id?: string
): Promise<Interview[]> {
  console.log("searchInterviewsByCandidateNameClient called with candidateName:", candidateName)
  const supabase = createClient()
  console.log("Supabase client created for search")
  const result = await searchInterviewsByCandidateName(supabase, candidateName, limit, user_id)
  console.log("searchInterviewsByCandidateName result:", result)
  return result
}

export async function fetchInterviewByIdClient(
  interviewId: string,
  user_id?: string
): Promise<Interview | null> {
  console.log("fetchInterviewByIdClient called with id:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for fetch by id")
  const result = await fetchInterviewById(supabase, interviewId, user_id)
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

// New client functions for user-specific operations
export async function fetchUserInterviewsClient(
  user_id: string,
  params: Omit<FetchInterviewsParams, 'user_id'> = {}
): Promise<FetchInterviewsResult> {
  console.log("fetchUserInterviewsClient called with user_id:", user_id)
  const supabase = createClient()
  console.log("Supabase client created for fetch user interviews")
  const result = await fetchUserInterviews(supabase, user_id, params)
  console.log("fetchUserInterviews result:", result)
  return result
}

export async function getCurrentUserInterviewsClient(
  params: Omit<FetchInterviewsParams, 'user_id'> = {}
): Promise<FetchInterviewsResult> {
  console.log("getCurrentUserInterviewsClient called")
  const supabase = createClient()
  console.log("Supabase client created for fetch current user interviews")
  const result = await getCurrentUserInterviews(supabase, params)
  console.log("getCurrentUserInterviews result:", result)
  return result
}

// New utility client functions
export async function getCurrentUserClient() {
  const supabase = createClient()
  return getCurrentUser(supabase)
}

export async function checkInterviewOwnershipClient(interviewId: string, user_id: string): Promise<boolean> {
  const supabase = createClient()
  return checkInterviewOwnership(supabase, interviewId, user_id)
}

export async function updateInterviewClient(
  interviewId: string,
  updates: Partial<Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'user_id'>>,
  user_id?: string
): Promise<Interview> {
  const supabase = createClient()
  return updateInterview(supabase, interviewId, updates, user_id)
}

// Profile management client functions
export async function getCurrentUserProfileClient() {
  const supabase = createClient()
  return getCurrentUserProfile(supabase)
}

export async function updateCurrentUserProfileClient(updates: { name?: string }) {
  const supabase = createClient()
  return updateCurrentUserProfile(supabase, updates)
}

export async function deleteCurrentUserAccountClient() {
  const supabase = createClient()
  return deleteCurrentUserAccount(supabase)
}
