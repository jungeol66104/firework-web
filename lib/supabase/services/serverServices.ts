import { createClient } from '../clients/server'
import { fetchInterviews, fetchInterviewById, createProfile, fetchProfileById, updateProfile, fetchUserInterviews, getCurrentUserInterviews, deleteInterview, searchInterviewsByCandidateName, getCurrentUser, checkInterviewOwnership, updateInterview, getCurrentUserProfile, updateCurrentUserProfile, deleteCurrentUserAccount, fetchInterviewQuestions, createReport, fetchCurrentUserReports, fetchReportById, updateReport, fetchAllReports, refundReportItem } from './services'
import { getUserTokens } from './tokenService'
import { createNotification, fetchNotifications, getUnreadCount, markNotificationAsRead, markNotificationAsUnread, markAllNotificationsAsRead } from './notificationService'
import { FetchInterviewsParams, FetchInterviewsResult, CreateProfileParams, Profile, Interview, CreateReportParams, Report, UpdateReportParams, CreateNotificationParams, Notification } from '@/lib/types'

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

// Token server services
export async function getUserTokensServer(): Promise<number> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return 0
  }
  
  return getUserTokens(supabase, user.id)
}

// Report server services
export async function createReportServer(params: CreateReportParams): Promise<Report> {
  const supabase = await createClient()
  return createReport(supabase, params)
}

export async function fetchCurrentUserReportsServer(): Promise<Report[]> {
  const supabase = await createClient()
  return fetchCurrentUserReports(supabase)
}

export async function fetchReportByIdServer(reportId: string): Promise<Report | null> {
  const supabase = await createClient()
  return fetchReportById(supabase, reportId)
}

export async function updateReportServer(reportId: string, updates: UpdateReportParams): Promise<Report> {
  const supabase = await createClient()
  return updateReport(supabase, reportId, updates)
}

export async function fetchAllReportsServer(status?: string): Promise<Report[]> {
  const supabase = await createClient()
  return fetchAllReports(supabase, status)
}

export async function refundReportItemServer(
  reportId: string,
  itemType: 'question' | 'answer',
  category: string,
  index: number
): Promise<Report> {
  const supabase = await createClient()
  return refundReportItem(supabase, reportId, itemType, category, index)
}

// Notification server services
export async function createNotificationServer(params: CreateNotificationParams): Promise<Notification> {
  const supabase = await createClient()
  return createNotification(supabase, params)
}

export async function fetchNotificationsServer(userId: string, limit?: number): Promise<Notification[]> {
  const supabase = await createClient()
  return fetchNotifications(supabase, userId, limit)
}

export async function fetchCurrentUserNotificationsServer(limit?: number): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  return fetchNotifications(supabase, user.id, limit)
}

export async function getUnreadCountServer(userId: string): Promise<number> {
  const supabase = await createClient()
  return getUnreadCount(supabase, userId)
}

export async function getCurrentUserUnreadCountServer(): Promise<number> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return 0
  }

  return getUnreadCount(supabase, user.id)
}

export async function markNotificationAsReadServer(notificationId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  return markNotificationAsRead(supabase, notificationId, userId)
}

export async function markNotificationAsUnreadServer(notificationId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  return markNotificationAsUnread(supabase, notificationId, userId)
}

export async function markAllNotificationsAsReadServer(userId: string): Promise<void> {
  const supabase = await createClient()
  return markAllNotificationsAsRead(supabase, userId)
}

export async function markCurrentUserAllNotificationsAsReadServer(): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  return markAllNotificationsAsRead(supabase, user.id)
}
