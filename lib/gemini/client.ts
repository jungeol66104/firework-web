import { GoogleGenAI, Type } from "@google/genai"

interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 2000,  // Start with 2 seconds
  maxDelayMs: 16000      // Max 16 seconds
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(2, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  // Add jitter (±20%) to avoid thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5)
  return Math.floor(cappedDelay + jitter)
}

/**
 * Check if error is retryable (503, 429, network errors)
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || ''
  const errorString = String(error)

  // 503 Service Unavailable / Overloaded
  if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
    return true
  }

  // 429 Rate Limit
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return true
  }

  // Network errors
  if (errorMessage.includes('UNAVAILABLE') || errorMessage.includes('timeout')) {
    return true
  }

  // Don't retry auth errors or invalid requests
  if (errorMessage.includes('API key not valid') || errorMessage.includes('400')) {
    return false
  }

  return false
}

interface GenerateContentParams {
  prompt: string
  responseSchema: any
  modelName: string
}

/**
 * Generate content with a single model, with retry logic
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  params: GenerateContentParams,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<string> {
  const { prompt, responseSchema, modelName } = params

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt - 1, retryConfig)
        console.log(`⏳ Retry attempt ${attempt}/${retryConfig.maxRetries} for ${modelName} after ${delay}ms delay`)
        await sleep(delay)
      }

      console.log(`🚀 Attempting Gemini API call with model: ${modelName} (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`)

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })

      const responseText = response.text

      if (!responseText) {
        throw new Error('Empty response from Gemini API')
      }

      console.log(`✅ Successfully used ${modelName} (attempt ${attempt + 1})`)
      return responseText

    } catch (error) {
      lastError = error as Error
      const isRetryable = isRetryableError(error)

      console.error(`❌ Failed with ${modelName} (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}):`,
        error instanceof Error ? error.message : 'Unknown error',
        `- Retryable: ${isRetryable}`
      )

      // Don't retry non-retryable errors
      if (!isRetryable) {
        throw error
      }

      // Don't retry if this was the last attempt
      if (attempt === retryConfig.maxRetries) {
        throw error
      }
    }
  }

  throw lastError || new Error('Unknown error during retry')
}

/**
 * Generate content with fallback models
 */
export async function generateWithGemini(
  prompt: string,
  responseType: 'question' | 'answer' | 'questions_bulk' | 'answers',
  retryConfig?: RetryConfig
): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...')
  console.log('Prompt length:', prompt.length)

  const ai = new GoogleGenAI({ apiKey: geminiApiKey })

  // Define response schema based on type
  let responseSchema: any

  if (responseType === 'questions_bulk') {
    // For bulk questions generation (30 questions in 3 categories)
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        general_personality: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 10,
          maxItems: 10
        },
        cover_letter_personality: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 10,
          maxItems: 10
        },
        cover_letter_competency: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 10,
          maxItems: 10
        }
      },
      required: ["general_personality", "cover_letter_personality", "cover_letter_competency"]
    }
  } else if (responseType === 'answers') {
    // For bulk answers generation
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        answers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              index: { type: Type.NUMBER },
              answer: { type: Type.STRING }
            }
          }
        }
      },
      required: ['answers']
    }
  } else {
    // For single question or answer
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        [responseType]: {
          type: Type.STRING
        }
      },
      required: [responseType]
    }
  }

  // Models to try in order
  const modelsToTry = [
    { name: 'gemini-2.5-pro', description: 'Gemini 2.5 Pro' },
    { name: 'gemini-2.5-pro-001', description: 'Gemini 2.5 Pro (stable)' },
    { name: 'gemini-2.5-flash', description: 'Gemini 2.5 Flash (fallback)' }
  ]

  // Try each model with retries
  for (const model of modelsToTry) {
    try {
      const result = await generateWithRetry(
        ai,
        {
          prompt,
          responseSchema,
          modelName: model.name
        },
        retryConfig
      )

      return result

    } catch (error) {
      console.error(`❌ Model ${model.name} failed after retries:`,
        error instanceof Error ? error.message : 'Unknown error'
      )

      // If API key is invalid, don't try other models
      if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error('Invalid Gemini API key')
      }

      // If this was the last model, throw
      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw new Error(`All models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Otherwise continue to next model
      console.log(`⏭️ Trying next model...`)
    }
  }

  throw new Error('No models available')
}
