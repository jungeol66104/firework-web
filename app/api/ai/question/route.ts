import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { fetchInterviewByIdServer } from '@/lib/supabase/services/serverServices'
import { getUserTokens, spendTokens } from '@/lib/supabase/services/tokenService'
import { GoogleGenAI, Type } from "@google/genai"

export async function POST(request: NextRequest) {
  try {
    const { interviewId, comment, questionId } = await request.json()
    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      )
    }

    // Get the current user from the request
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch the interview data
    const interview = await fetchInterviewByIdServer(interviewId, user.id)
    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    // Check if user has sufficient tokens
    const tokens = await getUserTokens(supabase, user.id)
    if (tokens < 1) {
      return NextResponse.json(
        { error: 'Insufficient tokens', tokens: tokens },
        { status: 402 }
      )
    }

    // Fetch existing question data if in regeneration mode
    let previousQuestions = null
    if (questionId) {
      console.log('Regeneration mode: fetching existing question with ID:', questionId)
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('interview_questions')
        .select('question_data')
        .eq('id', questionId)
        .single()
      
      if (fetchError) {
        console.error('Error fetching existing question:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch existing question for regeneration' },
          { status: 500 }
        )
      }
      
      previousQuestions = existingQuestion?.question_data
      console.log('Retrieved previous questions for regeneration')
    }

    // Prepare the prompt using the template
    const prompt = generatePrompt(interview, comment, previousQuestions)
    console.log('Generated prompt length:', prompt.length)
    
    // Note: Removed character limit check as requested
    
    const question = await generateQuestionWithGemini(prompt)
    console.log('Generated question length:', question.length)

    // Parse and validate JSON response - STRICT MODE
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
        // Handle generic code blocks
        const jsonMatch = jsonString.match(/```\s*\n([\s\S]*?)\n\s*```/)
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim()
        }
      }
      
      // Try to parse the JSON
      questionData = JSON.parse(jsonString)
      console.log('Successfully parsed JSON question data:', Object.keys(questionData))
      
      // STRICT VALIDATION - Must have exact structure
      const requiredKeys = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
      const hasRequiredKeys = requiredKeys.every(key => {
        const arr = questionData[key]
        return Array.isArray(arr) && arr.length === 10 && arr.every(item => typeof item === 'string' && item.trim().length > 0)
      })
      
      if (!hasRequiredKeys) {
        console.error('JSON structure validation failed. Required: 3 arrays of exactly 10 non-empty strings each')
        console.error('Found keys:', questionData ? Object.keys(questionData) : 'none')
        throw new Error('Invalid JSON structure from Gemini API')
      }
      
      console.log('JSON validation passed - all 3 categories have exactly 10 questions each')
      
    } catch (error) {
      console.error('JSON parsing/validation failed:', error)
      console.log('Raw response:', question)
      
      // NO FALLBACK - Reject completely if JSON is invalid
      throw new Error('Failed to generate valid JSON questions. Please try again.')
    }

    // Save the JSON data to the database
    console.log('Saving validated JSON question data to database')
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
      console.error('Error saving question:', saveError)
      return NextResponse.json(
        { error: 'Failed to save question' },
        { status: 500 }
      )
    }
    console.log('Question saved successfully, ID:', savedQuestion.id)

    // Deduct 1 token after successful generation
    const tokenSpent = await spendTokens(supabase, user.id, 1)
    if (!tokenSpent) {
      console.error('Failed to deduct token after successful generation')
    }

    console.log('Returning response with question ID:', savedQuestion.id)
    return NextResponse.json({
      question: savedQuestion,
      success: true
    })

  } catch (error) {
    console.error('Error generating question:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

  // Initialize Google GenAI with API key
  const ai = new GoogleGenAI({ apiKey: geminiApiKey })

  try {
    console.log('Calling Gemini API with model: gemini-2.5-flash with JSON mode and schema')
    
    // Define JSON schema for structured output using Type enum
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
      model: "gemini-2.5-flash",
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
    
    return responseText
  } catch (error) {
    console.error('Gemini API error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your API key in .env.local and ensure it has access to Gemini')
    }
    
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
