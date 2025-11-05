// Sample data removed - using Interview type from database instead

// Notification message templates
export const NOTIFICATION_MESSAGES = {
  questions_generated: (companyName: string) =>
    `${companyName} 면접의 질문 30개가 생성되었습니다.`,
  answers_generated: (companyName: string) =>
    `${companyName} 면접의 답변 30개가 생성되었습니다.`,
  question_regenerated: (companyName: string, index: number) =>
    `${companyName} 면접의 질문 ${index + 1}번이 재생성되었습니다.`,
  answer_regenerated: (companyName: string, index: number) =>
    `${companyName} 면접의 답변 ${index + 1}번이 재생성되었습니다.`,
  question_edited: (companyName: string, index: number) =>
    `${companyName} 면접의 질문 ${index + 1}번이 수정되었습니다.`,
  answer_edited: (companyName: string, index: number) =>
    `${companyName} 면접의 답변 ${index + 1}번이 수정되었습니다.`,
  report_comment: (companyName: string) => `${companyName} 면접 이의신청에 관리자가 답변했습니다.`,
  report_refund: (companyName: string, tokens: number) => `${companyName} 면접 이의신청이 환불 처리되었습니다. 토큰 ${tokens}개가 지급되었습니다.`,
  payment_complete: (tokens: number) => `${tokens}개 토큰이 충전되었습니다.`,
} as const
