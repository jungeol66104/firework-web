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
  | 'admin_edited'             // Admin manual edit (관리자 수정)

export interface TargetItem {
  category: 'general_personality' | 'cover_letter_personality' | 'cover_letter_competency'
  index: number
}

export interface TargetItems {
  questions: TargetItem[]
  answers: TargetItem[]
}

export interface InterviewQA {
  id: string
  interview_id: string
  name: string
  questions_data: InterviewQuestionData
  answers_data: InterviewAnswerData | null
  is_default: boolean
  type: ChangeType
  created_at: string
  parent_qa_id?: string | null
  target_items?: TargetItems
  tokens_used?: number
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
  referral_code?: string
  referred_by?: string
  signup_platform?: string
  signup_platform_detail?: string
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

// Notification types
export type NotificationType =
  | 'questions_generated'
  | 'answers_generated'
  | 'question_regenerated'
  | 'answer_regenerated'
  | 'question_edited'
  | 'answer_edited'
  | 'report_comment'
  | 'report_refund'
  | 'payment_complete'

export interface NotificationMetadata {
  category?: 'general_personality' | 'cover_letter_personality' | 'cover_letter_competency'
  index?: number
  tokens?: number
  refund_count?: number
  company_name?: string
  selected_count?: number
  generated_count?: number
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  message: string
  interview_id: string | null
  interview_qas_id: string | null
  report_id: string | null
  payment_id: string | null
  metadata: NotificationMetadata
  is_read: boolean
  created_at: string
}

export interface CreateNotificationParams {
  user_id: string
  type: NotificationType
  message: string
  interview_id?: string
  interview_qas_id?: string
  report_id?: string
  payment_id?: string
  metadata?: NotificationMetadata
}
