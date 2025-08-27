// Main store
export { useStore } from './store'

// Selector hooks
export {
  useCurrentInterview,
  useInterviews,
  useInterviewLoading,
  useQuestions,
  useCurrentQuestion,
  useCurrentQuestionId,
  useQuestionsLoading,
  useQuestionGenerationLoading,
  useAnswers,
  useCurrentAnswer,
  useAnswersLoading,
  useAnswerGenerationLoading,
  useTokens,
  useTokensLoading,
  useRefreshTokens,
  useDecrementTokens,
  useActiveJobs,
  useIsPolling,
  useHasActiveJob,
  useStartPolling,
  useStopPolling,
  useAddActiveJob,
  useUpdateJob,
  useRemoveJob,
  useSetCompletionCallback,
  useRemoveCompletionCallback,
} from './store'

// Slice types (for advanced usage)
export type { InterviewSlice } from './slices/interviewSlice'
export type { QuestionsSlice } from './slices/questionsSlice'
export type { AnswersSlice } from './slices/answersSlice'
export type { TokenSlice } from './slices/tokenSlice'
export type { JobsSlice } from './slices/jobsSlice'
