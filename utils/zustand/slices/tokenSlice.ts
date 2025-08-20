import { getUserTokensClient } from '@/utils/supabase/services/clientServices'

export interface TokenSlice {
  tokens: number
  isLoadingTokens: boolean
  lastFetched: number | null
  
  // Actions
  setTokens: (tokens: number) => void
  decrementTokens: (amount: number) => void
  refreshTokens: () => Promise<void>
  setLoadingTokens: (loading: boolean) => void
}

export const createTokenSlice = (set: any, get: any): TokenSlice => ({
  tokens: 0,
  isLoadingTokens: false,
  lastFetched: null,
  
  setTokens: (tokens) => set({ 
    tokens, 
    lastFetched: Date.now() 
  }),
  
  decrementTokens: (amount) => set((state: any) => ({ 
    tokens: Math.max(0, state.tokens - amount),
    lastFetched: Date.now()
  })),
  
  refreshTokens: async () => {
    const state = get() as TokenSlice
    
    // Prevent multiple simultaneous requests
    if (state.isLoadingTokens) return
    
    set({ isLoadingTokens: true })
    
    try {
      const tokens = await getUserTokensClient()
      set({ 
        tokens, 
        isLoadingTokens: false,
        lastFetched: Date.now()
      })
    } catch (error) {
      console.error('Failed to refresh tokens:', error)
      set({ 
        isLoadingTokens: false
      })
    }
  },
  
  setLoadingTokens: (loading) => set({ isLoadingTokens: loading }),
})