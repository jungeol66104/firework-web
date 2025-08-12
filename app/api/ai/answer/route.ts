import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/clients/server'
import { fetchInterviewByIdServer, fetchInterviewQuestionsServer } from '@/utils/supabase/services/serverServices'
import { GoogleGenAI } from "@google/genai"

export async function POST(request: NextRequest) {
  try {
    const { interviewId, questionId, comment } = await request.json()
    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      )
    }

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
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

    // Fetch the specific question
    const questions = await fetchInterviewQuestionsServer(interviewId)
    const question = questions.find(q => q.id === questionId)
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Prepare the prompt using the template
    const prompt = generatePrompt(interview, question, comment)
    console.log('Generated answer prompt length:', prompt.length)
    
    // Check if prompt is too long (Gemini has limits)
    if (prompt.length > 30000) {
      console.warn('Answer prompt is very long, may cause issues')
    }
    
    const answer = await generateAnswerWithGemini(prompt)
    console.log('Generated answer length:', answer.length)

    // Save the generated answer to the database
    console.log('Saving answer to database, length:', answer.length)
    const { data: savedAnswer, error: saveError } = await supabase
      .from('interview_answers')
      .insert({
        interview_id: interviewId,
        question_id: questionId,
        answer_text: answer,
        comment: comment || null
      })
      .select()
      .single()
    if (saveError) {
      console.error('Error saving answer:', saveError)
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      )
    }
    console.log('Answer saved successfully, ID:', savedAnswer.id)

    console.log('Returning response with answer ID:', savedAnswer.id)
    return NextResponse.json({
      answer: savedAnswer,
      success: true
    })

  } catch (error) {
    console.error('Error generating answer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generatePrompt(interview: any, question: any, comment?: string): string {
  const prompt = `Lead : 답변은 400자 이상으로 원칙에 따라 구성해줘. 

[원칙]
- 두괄식이어야
- 논리적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨
- 분량은 문항별로 450-500자 사이로 맞춰야
- 1분 자기소개는 "1분 자기소개 쓸 때 참고할 것"에 있는 좋은 사례의 구성과 흐름을 참고해서 쓰도록 해야. 하지만 해당 사례의 내용은 절대 섞지 말 것.

[1분 자기소개 쓸 때 참고할 좋은 예]
안녕하십니까? 저는 "현장의 실제 필요에 맞춰 HR 솔루션을 최적화하는" 지원자 OOO입니다. 
SK텔레콤 신입 교육 운영 시, 100명 이상 교육생의 개별 문의와 돌발적인 장비 문제를 실시간 해결하며 복잡한 일정을 완수했습니다. 이때 강사진, IT팀과의 즉각적인 공조와 사전에 여러 시나리오를 가정한 비상 계획 덕분에 교육 몰입도를 지킬 수 있었고, '치밀한 준비'와 '유연한 현장력'의 시너지를 통해 최적의 HR 지원이 가능함을 체감했습니다.
씨드콥 노인 안전 교육 PM으로서는 어르신들의 시각적 인지 특성을 고려해 영상 자료의 글자 크기와 재생 속도까지 세밀하게 조절하는 등, 사용자의 미세한 필요에 맞춘 기획이 실제 교육 참여도와 안전 행동 변화로 이어짐을 경험했습니다.
저는 이처럼 '사람' 중심의 섬세한 관찰과 분석으로 HR 문제를 해결하고, 구성원이 실질적으로 체감하는 지원을 실현하는 데 집중합니다. 저의 현장 중심 문제 해결력과 운영 경험은 기아 파워트레인이 급변하는 환경 속에서도 구성원 역량을 효과적으로 결집하고, 현장이 만족하는 HR 시스템을 만드는 데 기여할 것입니다. 기아의 성장에 실질적 힘을 보태는, 믿을 수 있는 HR 전문가가 되겠습니다.

[질문]
${question.question_text}

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

async function generateAnswerWithGemini(prompt: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...')
  console.log('Answer prompt length:', prompt.length)

  // Initialize Google GenAI with API key
  const ai = new GoogleGenAI({ apiKey: geminiApiKey })

  try {
    console.log('Calling Gemini API with model: gemini-2.5-pro')
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    })
    
    console.log('Gemini API response received, length:', response.text?.length || 0)
    return response.text || '답변을 생성할 수 없습니다.'
  } catch (error) {
    console.error('Gemini API error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your API key in .env.local and ensure it has access to Gemini')
    }
    
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
