import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createClient } from '@/lib/supabase/clients/server'
import { fetchInterviewByIdServer } from '@/lib/supabase/services/serverServices'
import { spendTokens } from '@/lib/supabase/services/tokenService'
import { createJobManager } from '@/lib/jobs/jobManager'
import { GoogleGenAI, Type } from "@google/genai"

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, userId, interviewId, comment } = body

    console.log('Processing question generation job:', jobId)

    // Get supabase client and job manager
    const supabase = await createClient()
    const jobManager = createJobManager(supabase)

    // Mark job as processing
    await jobManager.markJobAsProcessing(jobId)

    try {
      // Fetch the interview data
      const interview = await fetchInterviewByIdServer(interviewId, userId)
      if (!interview) {
        await jobManager.markJobAsFailed(jobId, 'Interview not found')
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
      }

      // Check for regeneration mode by looking for existing questions
      let previousQuestions = null
      // For now, we'll implement initial generation only
      // TODO: Add regeneration support if needed

      // Prepare the prompt
      const prompt = generatePrompt(interview, comment, previousQuestions)
      console.log('Generated prompt for job', jobId, 'length:', prompt.length)
      
      // Generate with Gemini
      const question = await generateQuestionWithGemini(prompt)
      console.log('Generated question for job', jobId, 'length:', question.length)

      // Parse and validate JSON response
      let questionData: any = null
      try {
        let jsonString = question.trim()
        
        // Extract JSON from markdown code blocks if present
        if (jsonString.includes('```json')) {
          const jsonMatch = jsonString.match(/```json\s*\n([\s\S]*?)\n\s*```/)
          if (jsonMatch) {
            jsonString = jsonMatch[1].trim()
          }
        } else if (jsonString.includes('```')) {
          const jsonMatch = jsonString.match(/```\s*\n([\s\S]*?)\n\s*```/)
          if (jsonMatch) {
            jsonString = jsonMatch[1].trim()
          }
        }
        
        questionData = JSON.parse(jsonString)
        
        // Validate structure
        const requiredKeys = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
        const hasRequiredKeys = requiredKeys.every(key => {
          const arr = questionData[key]
          return Array.isArray(arr) && arr.length === 10 && arr.every(item => typeof item === 'string' && item.trim().length > 0)
        })
        
        if (!hasRequiredKeys) {
          throw new Error('Invalid JSON structure from Gemini API')
        }
        
        console.log('JSON validation passed for job', jobId)
        
      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        await jobManager.markJobAsFailed(jobId, 'Failed to generate valid JSON questions')
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Save to database
      const { data: savedQuestion, error: saveError } = await supabase
        .from('interview_questions')
        .insert({
          interview_id: interviewId,
          question_data: questionData,
          comment: comment || null
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving question for job', jobId, ':', saveError)
        await jobManager.markJobAsFailed(jobId, 'Failed to save question to database')
        return NextResponse.json({ error: 'Database save failed' }, { status: 500 })
      }

      // Deduct token
      const tokenSpent = await spendTokens(supabase, userId, 1)
      if (!tokenSpent) {
        console.error('Failed to deduct token for job', jobId)
        // Don't fail the job for token deduction failure, but log it
      }

      // Mark job as completed with result
      await jobManager.markJobAsCompleted(jobId, {
        question_id: savedQuestion.id,
        question_data: questionData
      })

      console.log('Question generation job completed successfully:', jobId)
      return NextResponse.json({ success: true, questionId: savedQuestion.id })

    } catch (error) {
      console.error('Error in question generation for job', jobId, ':', error)
      await jobManager.markJobAsFailed(jobId, error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error processing question generation job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generatePrompt(interview: any, comment?: string, previousQuestions?: any): string {
  if (previousQuestions) {
    // Regeneration mode prompt
    const prompt = `다음 기존 질문들을 참고하여 사용자 요청에 따라 질문을 생성해줘. 동일한 JSON 형식으로 정확히 30개를 유지해야 함.

[기존 질문들]
${JSON.stringify(previousQuestions, null, 2)}

[사용자 요청]
${comment || '기존 질문들을 개선해서 더 나은 질문으로 만들어줘'}

[JSON 출력 형식]
{
  "general_personality": [
    "1분 자기소개 부탁드립니다.",
    "질문 2",
    "질문 3",
    "질문 4",
    "질문 5",
    "질문 6",
    "질문 7",
    "질문 8",
    "질문 9",
    "질문 10"
  ],
  "cover_letter_personality": [10개],
  "cover_letter_competency": [10개]
}

[질문 카테고리별 특성]
- general_personality: 자기소개서와 무관
- cover_letter_personality: 자기소개서와 관련
- cover_letter_competency: 자기소개서와 관련

[기본 원칙]
- 첫 번째 질문은 반드시 '1분 자기소개 부탁드립니다.' 유지
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 직관적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨

[데이터]
<회사 정보>
${interview.company_info || ''}

<직무 정보>
${interview.position || ''}
${interview.job_posting || ''}

<자기소개서>
${interview.cover_letter || ''}

<이력서>
${interview.resume || ''}

<예상 질문>
${interview.expected_questions || ''}

<채점 항목>
${interview.company_evaluation || ''}`

    return prompt
  } else {
    // Initial generation mode prompt
    const prompt = `다음 JSON 형식으로 정확히 30개 면접 질문을 생성해줘. 첫 번째 질문은 반드시 '1분 자기소개 부탁드립니다.'로 시작해야 함.

[JSON 출력 형식]
{
  "general_personality": [
    "1분 자기소개 부탁드립니다.",
    "질문 2",
    "질문 3",
    "질문 4",
    "질문 5",
    "질문 6",
    "질문 7",
    "질문 8",
    "질문 9",
    "질문 10"
  ],
  "cover_letter_personality": [10개],
  "cover_letter_competency": [10개]
}

[질문 카테고리별 특성]
- general_personality: 자기소개서와 무관
- cover_letter_personality: 자기소개서와 관련
- cover_letter_competency: 자기소개서와 관련

[원칙]
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 직관적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨

[데이터]
<회사 정보>
${interview.company_info || ''}

<직무 정보>
${interview.position || ''}
${interview.job_posting || ''}

<자기소개서>
${interview.cover_letter || ''}

<이력서>
${interview.resume || ''}

<예상 질문>
${interview.expected_questions || ''}

<채점 항목>
${interview.company_evaluation || ''}

[개선 요청]
${comment || '없음'}`

    return prompt
  }
}

async function generateQuestionWithGemini(prompt: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...')
  console.log('Prompt length:', prompt.length)

  const ai = new GoogleGenAI({ apiKey: geminiApiKey })

  const modelsToTry = [
    { name: 'gemini-2.5-pro', description: 'Gemini 2.5 Pro' },
    { name: 'gemini-2.5-pro-001', description: 'Gemini 2.5 Pro (stable)' },
    { name: 'gemini-2.5-flash', description: 'Gemini 2.5 Flash (fallback)' }
  ]

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting to call Gemini API with model: ${model.name}`)
      
      const responseSchema = {
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
      
      const response = await ai.models.generateContent({
        model: model.name,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })
      
      const responseText = response.text
      console.log('Gemini API response received, length:', responseText?.length || 0)
      
      if (!responseText) {
        throw new Error('Empty response from Gemini API')
      }
      
      console.log(`✅ Successfully used ${model.name}`)
      return responseText
      
    } catch (error) {
      console.error(`❌ Failed with ${model.name}:`, error instanceof Error ? error.message : 'Unknown error')
      
      if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error('Invalid Gemini API key')
      }
      
      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw new Error(`All models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      continue
    }
  }
  
  throw new Error('No models available')
}

// Use QStash signature verification
export const POST = verifySignatureAppRouter(handler)