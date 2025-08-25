import { InterviewAnswer } from '@/lib/types'

export interface AnswersSlice {
  answers: InterviewAnswer[]
  currentAnswer: string // Generated answer content (not saved yet)
  currentAnswerId: string // ID of selected answer for regeneration
  isLoadingAnswers: boolean
  isLoadingAnswerGeneration: boolean
  
  // Actions
  setAnswers: (answers: InterviewAnswer[]) => void
  addAnswer: (answer: InterviewAnswer) => void
  removeAnswer: (id: string) => void
  updateAnswer: (id: string, updates: Partial<InterviewAnswer>) => void
  setCurrentAnswer: (answer: string) => void
  setCurrentAnswerId: (id: string) => void
  setAnswersLoading: (loading: boolean) => void
  setAnswerGenerationLoading: (loading: boolean) => void
  resetAnswers: () => void
}

export const createAnswersSlice = (set: any, get: any): AnswersSlice => ({
  answers: [],
  currentAnswer: '',
  currentAnswerId: '',
  isLoadingAnswers: false,
  isLoadingAnswerGeneration: false,
  
  setAnswers: (answers) => set({ answers }),
  addAnswer: (answer) => set((state: any) => ({
    answers: [answer, ...state.answers]
  })),
  removeAnswer: (id) => set((state: any) => ({
    answers: state.answers.filter((a: InterviewAnswer) => a.id !== id)
  })),
  updateAnswer: (id, updates) => set((state: any) => ({
    answers: state.answers.map((a: InterviewAnswer) => 
      a.id === id ? { ...a, ...updates } : a
    )
  })),
  setCurrentAnswer: (answer) => set({ currentAnswer: answer }),
  setCurrentAnswerId: (id) => set({ currentAnswerId: id }),
  setAnswersLoading: (loading) => set({ isLoadingAnswers: loading }),
  setAnswerGenerationLoading: (loading) => set({ isLoadingAnswerGeneration: loading }),
  resetAnswers: () => set({ 
    answers: [], 
    currentAnswer: '', 
    currentAnswerId: '',
    isLoadingAnswers: false,
    isLoadingAnswerGeneration: false
  }),
})
