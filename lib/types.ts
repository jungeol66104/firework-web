export interface Interview {
  id: string
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

export interface InterviewQuestionData {
  general_personality: string[]
  cover_letter_personality: string[]
  cover_letter_competency: string[]
}

export interface InterviewAnswerData {
  general_personality: string[]
  cover_letter_personality: string[]
  cover_letter_competency: string[]
}

export type ChangeType =
  | 'questions_generated'      // Generate 30 questions (질문지 생성)
  | 'answers_generated'        // Generate answers for selected questions (답변지 생성)
  | 'question_regenerated'     // Regenerate a question
  | 'question_edited'          // Edit a question by comment
  | 'answer_regenerated'       // Regenerate an answer
  | 'answer_edited'            // Edit an answer by comment

export interface InterviewQA {
  id: string
  interview_id: string
  name: string
  questions_data: InterviewQuestionData
  answers_data: InterviewAnswerData | null
  is_default: boolean
  type: ChangeType
  created_at: string
}

export interface InterviewQAJob {
  id: string
  user_id: string
  interview_id: string
  type: ChangeType
  status: 'queued' | 'processing' | 'completed' | 'failed'
  input_data: Record<string, any>
  interview_qas_id: string | null
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

// Legacy types - kept for backward compatibility, to be removed
export interface InterviewQuestion {
  id: string
  interview_id: string
  question_text: string
  question_data: InterviewQuestionData | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface InterviewAnswer {
  id: string
  interview_id: string
  question_id: string
  answer_text: string
  answer_data: InterviewAnswerData | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  email?: string
  is_admin?: boolean
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

// Report types
export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'rejected'

export interface ReportItem {
  category: string
  index: number
  refunded?: boolean
  refund_amount?: number
  refunded_at?: string
}

export interface ReportItems {
  questions: ReportItem[]
  answers: ReportItem[]
}

export interface Report {
  id: string
  user_id: string
  interview_id: string
  interview_qas_id: string
  items: ReportItems
  description: string
  status: ReportStatus
  admin_response: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateReportParams {
  interview_qas_id: string
  selectedQuestions: string[]
  selectedAnswers: string[]
  description: string
}

export interface UpdateReportParams {
  status?: ReportStatus
  admin_response?: string
}
