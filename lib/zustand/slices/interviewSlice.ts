import { Interview } from '@/lib/types'

export interface InterviewSlice {
  currentInterview: Interview | null
  interviews: Interview[]
  isLoading: boolean
  
  // Actions
  setCurrentInterview: (interview: Interview | null) => void
  setInterviews: (interviews: Interview[]) => void
  addInterview: (interview: Interview) => void
  updateInterview: (id: string, updates: Partial<Interview>) => void
  removeInterview: (id: string) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const createInterviewSlice = (set: any, get: any): InterviewSlice => ({
  currentInterview: null,
  interviews: [],
  isLoading: false,
  
  setCurrentInterview: (interview) => set({ currentInterview: interview }),
  setInterviews: (interviews) => set({ interviews }),
  addInterview: (interview) => set((state: any) => ({
    interviews: [interview, ...state.interviews]
  })),
  updateInterview: (id, updates) => set((state: any) => ({
    interviews: state.interviews.map((i: Interview) => 
      i.id === id ? { ...i, ...updates } : i
    ),
    currentInterview: state.currentInterview?.id === id 
      ? { ...state.currentInterview, ...updates }
      : state.currentInterview
  })),
  removeInterview: (id) => set((state: any) => ({
    interviews: state.interviews.filter((i: Interview) => i.id !== id),
    currentInterview: state.currentInterview?.id === id 
      ? null 
      : state.currentInterview
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ 
    currentInterview: null, 
    interviews: [], 
    isLoading: false 
  }),
})
