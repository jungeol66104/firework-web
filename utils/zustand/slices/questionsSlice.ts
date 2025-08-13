import { InterviewQuestion } from '@/utils/types'

export interface QuestionsSlice {
  questions: InterviewQuestion[]
  currentQuestion: string // Generated question content (not saved yet)
  currentQuestionId: string // ID of the currently selected question
  isLoadingQuestions: boolean
  isLoadingQuestionGeneration: boolean
  
  // Actions
  setQuestions: (questions: InterviewQuestion[]) => void
  addQuestion: (question: InterviewQuestion) => void
  removeQuestion: (id: string) => void
  updateQuestion: (id: string, updates: Partial<InterviewQuestion>) => void
  setCurrentQuestion: (question: string) => void
  setCurrentQuestionId: (id: string) => void
  setQuestionsLoading: (loading: boolean) => void
  setQuestionGenerationLoading: (loading: boolean) => void
  resetQuestions: () => void
}

export const createQuestionsSlice = (set: any, get: any): QuestionsSlice => ({
  questions: [],
  currentQuestion: '',
  currentQuestionId: '',
  isLoadingQuestions: false,
  isLoadingQuestionGeneration: false,
  
  setQuestions: (questions) => set({ questions }),
  addQuestion: (question) => set((state: any) => ({
    questions: [question, ...state.questions]
  })),
  removeQuestion: (id) => set((state: any) => ({
    questions: state.questions.filter((q: InterviewQuestion) => q.id !== id)
  })),
  updateQuestion: (id, updates) => set((state: any) => ({
    questions: state.questions.map((q: InterviewQuestion) => 
      q.id === id ? { ...q, ...updates } : q
    )
  })),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setCurrentQuestionId: (id) => set({ currentQuestionId: id }),
  setQuestionsLoading: (loading) => set({ isLoadingQuestions: loading }),
  setQuestionGenerationLoading: (loading) => set({ isLoadingQuestionGeneration: loading }),
  resetQuestions: () => set({ 
    questions: [], 
    currentQuestion: '', 
    currentQuestionId: '',
    isLoadingQuestions: false,
    isLoadingQuestionGeneration: false
  }),
})
