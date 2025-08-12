export interface Interview {
  id: string
  candidate_name: string
  company_name: string
  position: string
  job_posting: string
  cover_letter: string
  resume: string
  company_info: string
  expected_questions: string
  company_evaluation: string
  other: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface InterviewQuestion {
  id: string
  interview_id: string
  question_text: string
  comment: string | null
  created_at: string
  updated_at: string
}

export interface InterviewAnswer {
  id: string
  interview_id: string
  question_id: string
  answer_text: string
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  created_at: string
}

export interface CreateProfileParams {
  id: string
  name: string
}

export interface FetchInterviewsParams {
  limit?: number
  cursor?: string
  orderBy?: 'created_at' | 'updated_at' | 'candidate_name'
  orderDirection?: 'asc' | 'desc'
  user_id?: string
}

export interface FetchInterviewsResult {
  interviews: Interview[]
  nextCursor?: string
  hasMore: boolean
}

export interface CreateInterviewParams {
  candidate_name?: string
  company_name?: string
  position?: string
  job_posting?: string
  cover_letter?: string
  resume?: string
  company_info?: string
  expected_questions?: string
  company_evaluation?: string
  other?: string
  user_id: string
}
