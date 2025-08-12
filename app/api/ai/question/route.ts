import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/clients/server'
import { fetchInterviewByIdServer } from '@/utils/supabase/services/serverServices'
import { GoogleGenAI } from "@google/genai"

export async function POST(request: NextRequest) {
  try {
    const { interviewId, comment } = await request.json()
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

    // Check if user has remaining chances (you might want to implement this based on your subscription model)
    // For now, we'll proceed with the generation

    // Prepare the prompt using the template
    const prompt = generatePrompt(interview, comment)
    console.log('Generated prompt length:', prompt.length)
    
    // Check if prompt is too long (Gemini has limits)
    if (prompt.length > 30000) {
      console.warn('Prompt is very long, may cause issues')
    }
    
    const question = await generateQuestionWithGemini(prompt)
    console.log('Generated question length:', question.length)

    // Save the generated question to the database
    console.log('Saving question to database, length:', question.length)
    const { data: savedQuestion, error: saveError } = await supabase
      .from('interview_questions')
      .insert({
        interview_id: interviewId,
        question_text: question,
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

function generatePrompt(interview: any, comment?: string): string {
  const prompt = `Lead : 이 사람이 지원하는 회사 및 직무 정보와 이 사람의 자기소개를 바탕으로 자기소개 기반 인성면접 질문 10개와 자기소개 기반 직무 역량 확인용 질문 10개와 일반 인성면접 질문 10개를 아래 형식으로 준비해줘. 이미 가지고 있는 질문지가 있다면, 포함시켜주고. 추가정보는 질문지 만들 때 절대로 사용하면 안 돼. 추가정보는 답변 만들 때만 활용해야 해. 질문이 직관적으로 이해될 수 있도록 해줘.

[원칙]
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨

[채점 항목]
${interview.company_evaluation || ''}

[형식]
1. 질문지
- 자기소개서 기반 인성면접 질문
- 자기소개서 기반 직무 역량 확인용 질문
- 일반 인성면접 질문
2. 질문지와 답변

[이미 가지고 있는 질문지]
- 1분 자기소개

[회사 및 직무 정보]
<회사 정보>
${interview.company_info || ''}

<직무 정보>
${interview.position || ''}
${interview.job_posting || ''}

[자기소개서]
${interview.cover_letter || ''}

[이력서]
${interview.resume || ''}

[추가 정보]
${interview.expected_questions || ''}
${interview.other || ''}
${comment || ''}`

  return prompt
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
    console.log('Calling Gemini API with model: gemini-2.0-flash-exp')
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    })
    
    console.log('Gemini API response received, length:', response.text?.length || 0)
    return response.text || '질문을 생성할 수 없습니다.'
  } catch (error) {
    console.error('Gemini API error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your API key in .env.local and ensure it has access to Gemini')
    }
    
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
