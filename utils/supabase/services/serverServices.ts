import { createClient } from '../clients/server'
import { fetchInterviews, fetchInterviewById, createProfile, fetchProfileById, updateProfile, fetchUserInterviews, getCurrentUserInterviews, deleteInterview, searchInterviewsByCandidateName, getCurrentUser, checkInterviewOwnership, updateInterview, getCurrentUserProfile, updateCurrentUserProfile, deleteCurrentUserAccount, fetchInterviewQuestions } from './services'
import { FetchInterviewsParams, FetchInterviewsResult, CreateProfileParams, Profile, Interview } from '@/utils/types'

export async function fetchInterviewsServer(params: FetchInterviewsParams = {}): Promise<FetchInterviewsResult> {
  const supabase = await createClient()
  return fetchInterviews(supabase, params)
}

export async function fetchInterviewByIdServer(interviewId: string, user_id?: string) {
  const supabase = await createClient();
  return fetchInterviewById(supabase, interviewId, user_id);
}

export async function deleteInterviewServer(interviewId: string, user_id?: string) {
  const supabase = await createClient();
  return deleteInterview(supabase, interviewId, user_id);
}

export async function searchInterviewsByCandidateNameServer(candidateName: string, limit: number = 10, user_id?: string) {
  const supabase = await createClient();
  return searchInterviewsByCandidateName(supabase, candidateName, limit, user_id);
}

// User-specific interview functions
export async function fetchUserInterviewsServer(user_id: string, params: Omit<FetchInterviewsParams, 'user_id'> = {}): Promise<FetchInterviewsResult> {
  const supabase = await createClient()
  return fetchUserInterviews(supabase, user_id, params)
}

export async function getCurrentUserInterviewsServer(params: Omit<FetchInterviewsParams, 'user_id'> = {}): Promise<FetchInterviewsResult> {
  const supabase = await createClient()
  return getCurrentUserInterviews(supabase, params)
}

// New utility server functions
export async function getCurrentUserServer() {
  const supabase = await createClient()
  return getCurrentUser(supabase)
}

export async function checkInterviewOwnershipServer(interviewId: string, user_id: string): Promise<boolean> {
  const supabase = await createClient()
  return checkInterviewOwnership(supabase, interviewId, user_id)
}

export async function updateInterviewServer(
  interviewId: string,
  updates: Partial<Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'user_id'>>,
  user_id?: string
) {
  const supabase = await createClient()
  return updateInterview(supabase, interviewId, updates, user_id)
}

// Profile server services
export async function createProfileServer(params: CreateProfileParams) {
  const supabase = await createClient()
  return createProfile(supabase, params)
}

export async function fetchProfileByIdServer(profileId: string) {
  const supabase = await createClient()
  return fetchProfileById(supabase, profileId)
}

export async function updateProfileServer(profileId: string, updates: { name?: string }) {
  const supabase = await createClient()
  return updateProfile(supabase, profileId, updates)
}

export async function getCurrentUserProfileServer(): Promise<Profile | null> {
  const supabase = await createClient()
  return getCurrentUserProfile(supabase)
}

export async function updateCurrentUserProfileServer(updates: { name?: string }) {
  const supabase = await createClient()
  return updateCurrentUserProfile(supabase, updates)
}

export async function deleteCurrentUserAccountServer() {
  const supabase = await createClient()
  
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

  // Finally, delete the user account from auth (this requires admin privileges)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    throw new Error(`Failed to delete user account: ${deleteError.message}`)
  }
}

// Interview Questions server services
export async function fetchInterviewQuestionsServer(interviewId: string) {
  const supabase = await createClient()
  return fetchInterviewQuestions(supabase, interviewId)
}
