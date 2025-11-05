import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createInterviewSlice, InterviewSlice } from './slices/interviewSlice'
import { createQuestionsSlice, QuestionsSlice } from './slices/questionsSlice'
import { createAnswersSlice, AnswersSlice } from './slices/answersSlice'
import { createTokenSlice, TokenSlice } from './slices/tokenSlice'
import { createJobsSlice, JobsSlice } from './slices/jobsSlice'
import { createNotificationsSlice, NotificationsSlice } from './slices/notificationsSlice'

// Helper function to get current user ID from localStorage or other auth source
function getCurrentUserIdFromAuth(): string | null {
  try {
    // Check for Supabase session in localStorage
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') && key.includes('auth-token')
    )
    
    if (supabaseKeys.length > 0) {
      const authData = localStorage.getItem(supabaseKeys[0])
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed?.user?.id || null
      }
    }
    
    return null
  } catch {
    return null
  }
}

// Combined store type
interface Store extends InterviewSlice, QuestionsSlice, AnswersSlice, TokenSlice, JobsSlice, NotificationsSlice {}

// Create the main store
export const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInterviewSlice(set, get),
        ...createQuestionsSlice(set, get),
        ...createAnswersSlice(set, get),
        ...createTokenSlice(set, get),
        ...createJobsSlice(set, get),
        ...createNotificationsSlice(set, get),
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
          currentUserId: state.currentUserId,
        }),
        // Override storage to handle user switching
        storage: {
          getItem: (name: string) => {
            const item = localStorage.getItem(name)
            if (!item) return null
            
            try {
              const data = JSON.parse(item)
              
              // Check if we have user data and if it matches current user
              if (typeof window !== 'undefined') {
                const currentUserId = getCurrentUserIdFromAuth()
                if (data.state?.currentUserId && data.state.currentUserId !== currentUserId) {
                  // Different user, clear the cache and return null
                  localStorage.removeItem(name)
                  return null
                }
              }
              
              return data
            } catch {
              return null
            }
          },
          setItem: (name: string, value: any) => {
            localStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name)
          },
        },
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

// Job selectors
export const useActiveJobs = () => useStore((state) => state.activeJobs)
export const useIsPolling = () => useStore((state) => state.isPolling)
export const useHasActiveJob = () => useStore((state) => state.hasActiveJob)
export const useStartPolling = () => useStore((state) => state.startPolling)
export const useStopPolling = () => useStore((state) => state.stopPolling)
export const useAddActiveJob = () => useStore((state) => state.addActiveJob)
export const useUpdateJob = () => useStore((state) => state.updateJob)
export const useRemoveJob = () => useStore((state) => state.removeJob)
export const useSetCompletionCallback = () => useStore((state) => state.setCompletionCallback)
export const useRemoveCompletionCallback = () => useStore((state) => state.removeCompletionCallback)

// Notification selectors
export const useNotifications = () => useStore((state) => state.notifications)
export const useUnreadCount = () => useStore((state) => state.unreadCount)
export const useNotificationsLoading = () => useStore((state) => state.isLoadingNotifications)
export const useNotificationDropdownOpen = () => useStore((state) => state.isDropdownOpen)
export const useFetchNotifications = () => useStore((state) => state.fetchNotifications)
export const useMarkNotificationAsRead = () => useStore((state) => state.markAsRead)
export const useMarkNotificationAsUnread = () => useStore((state) => state.markAsUnread)
export const useMarkAllNotificationsAsRead = () => useStore((state) => state.markAllAsRead)
export const useToggleNotificationDropdown = () => useStore((state) => state.toggleDropdown)
export const useSetNotificationDropdownOpen = () => useStore((state) => state.setDropdownOpen)
export const useSubscribeToNotifications = () => useStore((state) => state.subscribeToNotifications)
export const useUnsubscribeFromNotifications = () => useStore((state) => state.unsubscribeFromNotifications)




