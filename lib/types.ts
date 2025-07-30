export interface Interview {
  id: string
  candidate_name: string
  company_name: string
  position: string
  job_posting: string
  cover_letter: string
  company_info: string
  expected_questions: string
  company_evaluation: string
  created_at: string
  updated_at: string
}

export interface FetchInterviewsParams {
  limit?: number
  cursor?: string
  orderBy?: 'created_at' | 'updated_at' | 'candidate_name'
  orderDirection?: 'asc' | 'desc'
}

export interface FetchInterviewsResult {
  interviews: Interview[]
  nextCursor?: string
  hasMore: boolean
}

export interface CreateInterviewParams {
  candidate_name: string
  company_name?: string
  position?: string
  job_posting?: string
  cover_letter?: string
  company_info?: string
  expected_questions?: string
  company_evaluation?: string
}
