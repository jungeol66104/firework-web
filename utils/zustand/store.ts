import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createInterviewSlice, InterviewSlice } from './slices/interviewSlice'
import { createQuestionsSlice, QuestionsSlice } from './slices/questionsSlice'
import { createAnswersSlice, AnswersSlice } from './slices/answersSlice'
import { createTokenSlice, TokenSlice } from './slices/tokenSlice'

// Combined store type
interface Store extends InterviewSlice, QuestionsSlice, AnswersSlice, TokenSlice {}

// Create the main store
export const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInterviewSlice(set, get),
        ...createQuestionsSlice(set, get),
        ...createAnswersSlice(set, get),
        ...createTokenSlice(set, get),
      }),
      {
        name: 'interview-store',
        // Only persist interviews data, not loading states
        partialize: (state) => ({
          interviews: state.interviews,
          currentInterview: state.currentInterview,
          questions: state.questions,
          currentQuestion: state.currentQuestion,
          answers: state.answers,
          currentAnswer: state.currentAnswer,
          tokens: state.tokens,
          lastFetched: state.lastFetched,
        }),
      }
    ),
    {
      name: 'interview-store',
    }
  )
)

// Selector hooks for better performance
// Interview selectors
export const useCurrentInterview = () => useStore((state) => state.currentInterview)
export const useInterviews = () => useStore((state) => state.interviews)
export const useInterviewLoading = () => useStore((state) => state.isLoading)

// Questions selectors
export const useQuestions = () => useStore((state) => state.questions)
export const useCurrentQuestion = () => useStore((state) => state.currentQuestion)
export const useCurrentQuestionId = () => useStore((state) => state.currentQuestionId)
export const useQuestionsLoading = () => useStore((state) => state.isLoadingQuestions)
export const useQuestionGenerationLoading = () => useStore((state) => state.isLoadingQuestionGeneration)

// Answers selectors
export const useAnswers = () => useStore((state) => state.answers)
export const useCurrentAnswer = () => useStore((state) => state.currentAnswer)
export const useAnswersLoading = () => useStore((state) => state.isLoadingAnswers)
export const useAnswerGenerationLoading = () => useStore((state) => state.isLoadingAnswerGeneration)

// Token selectors
export const useTokens = () => useStore((state) => state.tokens)
export const useTokensLoading = () => useStore((state) => state.isLoadingTokens)
export const useRefreshTokens = () => useStore((state) => state.refreshTokens)
export const useDecrementTokens = () => useStore((state) => state.decrementTokens)




