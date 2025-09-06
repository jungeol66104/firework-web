import { createClient } from '../clients/client'
import { createInterview, deleteInterview, searchInterviewsByCandidateName, fetchInterviewById, fetchInterviews, fetchUserInterviews, getCurrentUserInterviews, getCurrentUser, checkInterviewOwnership, updateInterview, getCurrentUserProfile, updateCurrentUserProfile, deleteCurrentUserAccount, fetchInterviewQuestions, createInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion, fetchInterviewAnswers, createInterviewAnswer, updateInterviewAnswer, deleteInterviewAnswer } from './services'
import { getUserTokens } from './tokenService'
import { CreateInterviewParams, Interview, FetchInterviewsParams, FetchInterviewsResult } from '@/lib/types'

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

// Interview Questions client functions
export async function fetchInterviewQuestionsClient(interviewId: string): Promise<any[]> {
  console.log("fetchInterviewQuestionsClient called with interviewId:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for fetch interview questions")
  const result = await fetchInterviewQuestions(supabase, interviewId)
  console.log("fetchInterviewQuestions result:", result)
  return result
}

export async function createInterviewQuestionClient(params: {
  interview_id: string
  question_data: any
  comment?: string
}): Promise<any> {
  console.log("createInterviewQuestionClient called with params:", params)
  const supabase = createClient()
  console.log("Supabase client created for create interview question")
  const result = await createInterviewQuestion(supabase, params)
  console.log("createInterviewQuestion result:", result)
  return result
}

export async function updateInterviewQuestionClient(
  questionId: string,
  updates: {
    question_data?: any
    comment?: string
  }
): Promise<any> {
  console.log("updateInterviewQuestionClient called with questionId:", questionId, "updates:", updates)
  const supabase = createClient()
  console.log("Supabase client created for update interview question")
  const result = await updateInterviewQuestion(supabase, questionId, updates)
  console.log("updateInterviewQuestion result:", result)
  return result
}

export async function deleteInterviewQuestionClient(questionId: string): Promise<void> {
  console.log("deleteInterviewQuestionClient called with questionId:", questionId)
  const supabase = createClient()
  console.log("Supabase client created for delete interview question")
  await deleteInterviewQuestion(supabase, questionId)
  console.log("deleteInterviewQuestion completed")
}

// Generate question using AI
export async function generateQuestionClient(interviewId: string, comment?: string, questionId?: string): Promise<any> {
  console.log("generateQuestionClient called with interviewId:", interviewId, "comment:", comment, "questionId:", questionId)
  
  const response = await fetch('/api/ai/question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interviewId,
      comment,
      questionId
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to generate question')
  }

  const result = await response.json()
  console.log("generateQuestion result:", result)
  return result
}

// Generate answer using AI
export async function generateAnswerClient(interviewId: string, questionId: string, comment?: string, answerId?: string): Promise<any> {
  console.log("generateAnswerClient called with interviewId:", interviewId, "questionId:", questionId, "comment:", comment, "answerId:", answerId)
  
  const response = await fetch('/api/ai/answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interviewId,
      questionId,
      comment,
      answerId
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to generate answer')
  }

  const result = await response.json()
  console.log("generateAnswer result:", result)
  return result
}

// Interview Answers client functions
export async function fetchInterviewAnswersClient(interviewId: string): Promise<any[]> {
  console.log("fetchInterviewAnswersClient called with interviewId:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for fetch interview answers")
  const result = await fetchInterviewAnswers(supabase, interviewId)
  console.log("fetchInterviewAnswers result:", result)
  return result
}

export async function createInterviewAnswerClient(params: {
  interview_id: string
  question_id: string
  answer_data: any
  comment?: string
}): Promise<any> {
  console.log("createInterviewAnswerClient called with params:", params)
  const supabase = createClient()
  console.log("Supabase client created for create interview answer")
  const result = await createInterviewAnswer(supabase, params)
  console.log("createInterviewAnswer result:", result)
  return result
}

export async function updateInterviewAnswerClient(
  answerId: string,
  updates: {
    answer_data?: any
    comment?: string
  }
): Promise<any> {
  console.log("updateInterviewAnswerClient called with answerId:", answerId, "updates:", updates)
  const supabase = createClient()
  console.log("Supabase client created for update interview answer")
  const result = await updateInterviewAnswer(supabase, answerId, updates)
  console.log("updateInterviewAnswer result:", result)
  return result
}

export async function deleteInterviewAnswerClient(answerId: string): Promise<void> {
  console.log("deleteInterviewAnswerClient called with answerId:", answerId)
  const supabase = createClient()
  console.log("Supabase client created for delete interview answer")
  await deleteInterviewAnswer(supabase, answerId)
  console.log("deleteInterviewAnswer completed")
}

// Token management client functions
export async function getUserTokensClient(): Promise<number> {
  console.log("getUserTokensClient called")
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error("Failed to get user for token fetch:", authError)
    return 0
  }
  
  const tokens = await getUserTokens(supabase, user.id)
  console.log("getUserTokens result:", tokens)
  return tokens
}

export async function cancelJobClient(jobId: string): Promise<void> {
  const response = await fetch('/api/jobs/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to cancel job')
  }
}

export async function getUserActiveJobsClient(): Promise<any[]> {
  const response = await fetch('/api/jobs/active', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch active jobs')
  }

  const result = await response.json()
  return result.jobs || []
}
