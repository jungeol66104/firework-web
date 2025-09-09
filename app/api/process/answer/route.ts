import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createClient } from '@/lib/supabase/clients/server'
import { fetchInterviewByIdServer, fetchInterviewQuestionsServer } from '@/lib/supabase/services/serverServices'
import { spendTokens } from '@/lib/supabase/services/tokenService'
import { createJobManager } from '@/lib/jobs/jobManager'
import { GoogleGenAI, Type } from "@google/genai"

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, userId, interviewId, questionId, comment } = body

    console.log('Processing answer generation job:', jobId)

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

      // Fetch the specific question
      const questions = await fetchInterviewQuestionsServer(interviewId)
      const question = questions.find(q => q.id === questionId)
      if (!question) {
        await jobManager.markJobAsFailed(jobId, 'Question not found')
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }

      // Extract question data from the JSONB format
      const questionData = question.question_data
      if (!questionData) {
        await jobManager.markJobAsFailed(jobId, 'Question data not found')
        return NextResponse.json({ error: 'Question data not found' }, { status: 404 })
      }

      // Check for regeneration mode by looking for existing answers
      let previousAnswers = null
      // For now, we'll implement initial generation only
      // TODO: Add regeneration support if needed

      // Prepare the prompt
      const prompt = generatePrompt(interview, questionData, comment, previousAnswers)
      console.log('Generated answer prompt for job', jobId, 'length:', prompt.length)
      
      // Generate with Gemini
      const answer = await generateAnswerWithGemini(prompt)
      console.log('Generated answer for job', jobId, 'length:', answer.length)

      // Parse and validate JSON response
      let answerData: any = null
      try {
        let jsonString = answer.trim()
        
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
        
        answerData = JSON.parse(jsonString)
        
        // Validate structure
        const requiredKeys = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
        const hasRequiredKeys = requiredKeys.every(key => {
          const arr = answerData[key]
          return Array.isArray(arr) && arr.length === 10 && arr.every(item => typeof item === 'string' && item.trim().length > 0)
        })
        
        if (!hasRequiredKeys) {
          throw new Error('Invalid JSON structure from Gemini API')
        }
        
        console.log('JSON validation passed for job', jobId)
        
      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        await jobManager.markJobAsFailed(jobId, 'Failed to generate valid JSON answers')
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Save to database
      const { data: savedAnswer, error: saveError } = await supabase
        .from('interview_answers')
        .insert({
          interview_id: interviewId,
          question_id: questionId,
          answer_data: answerData,
          comment: comment || null
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving answer for job', jobId, ':', saveError)
        await jobManager.markJobAsFailed(jobId, 'Failed to save answer to database')
        return NextResponse.json({ error: 'Database save failed' }, { status: 500 })
      }

      // Deduct 6 tokens for answer generation (30 answers)
      const tokenSpent = await spendTokens(supabase, userId, 6)
      if (!tokenSpent) {
        console.error('Failed to deduct tokens for job', jobId)
        // Don't fail the job for token deduction failure, but log it
      }

      // Mark job as completed with result
      await jobManager.markJobAsCompleted(jobId, {
        answer_id: savedAnswer.id,
        answer_data: answerData
      })

      console.log('Answer generation job completed successfully:', jobId)
      return NextResponse.json({ success: true, answerId: savedAnswer.id })

    } catch (error) {
      console.error('Error in answer generation for job', jobId, ':', error)
      await jobManager.markJobAsFailed(jobId, error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error processing answer generation job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generatePrompt(interview: any, questionData: any, comment?: string, previousAnswers?: any): string {
  if (previousAnswers) {
    // Regeneration mode prompt
    const prompt = `다음 기존 답변들을 참고하여 사용자 요청에 따라 답변을 생성해줘. 동일한 JSON 형식으로 정확히 30개를 유지해야 함.

[기존 답변들]
${JSON.stringify(previousAnswers, null, 2)}

[사용자 요청]
${comment || '기존 답변들을 개선해서 더 나은 답변으로 만들어줘'}

[선택된 질문들]
${JSON.stringify(questionData, null, 2)}

[JSON 출력 형식]
{
  "general_personality": [
    "1분 자기소개 답변",
    "답변 2",
    "답변 3",
    "답변 4",
    "답변 5",
    "답변 6",
    "답변 7",
    "답변 8",
    "답변 9",
    "답변 10"
  ],
  "cover_letter_personality": [10개],
  "cover_letter_competency": [10개]
}

[답변 카테고리별 특성]
- general_personality: 자기소개서와 무관
- cover_letter_personality: 자기소개서와 관련  
- cover_letter_competency: 자기소개서와 관련

[기본 원칙]
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 직관적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 답변은 400자 이상으로 구성해야
- 분량은 450-500자 사이로 맞춰야
- 1분 자기소개는 "1분 자기소개 쓸 때 참고할 것"에 있는 좋은 사례의 구성과 흐름을 참고해야

[1분 자기소개 쓸 때 참고할 좋은 예]
안녕하십니까? 저는 "현장의 실제 필요에 맞춰 HR 솔루션을 최적화하는" 지원자 OOO입니다. 
SK텔레콤 신입 교육 운영 시, 100명 이상 교육생의 개별 문의와 돌발적인 장비 문제를 실시간 해결하며 복잡한 일정을 완수했습니다. 이때 강사진, IT팀과의 즉각적인 공조와 사전에 여러 시나리오를 가정한 비상 계획 덕분에 교육 몰입도를 지킬 수 있었고, '치밀한 준비'와 '유연한 현장력'의 시너지를 통해 최적의 HR 지원이 가능함을 체감했습니다.
씨드콥 노인 안전 교육 PM으로서는 어르신들의 시각적 인지 특성을 고려해 영상 자료의 글자 크기와 재생 속도까지 세밀하게 조절하는 등, 사용자의 미세한 필요에 맞춤 기획이 실제 교육 참여도와 안전 행동 변화로 이어짐을 경험했습니다.
저는 이처럼 '사람' 중심의 섬세한 관찰과 분석으로 HR 문제를 해결하고, 구성원이 실질적으로 체감하는 지원을 실현하는 데 집중합니다. 저의 현장 중심 문제 해결력과 운영 경험은 기아 파워트레인이 급변하는 환경 속에서도 구성원 역량을 효과적으로 결집하고, 현장이 만족하는 HR 시스템을 만드는 데 기여할 것입니다. 기아의 성장에 실질적 힘을 보태는, 믿을 수 있는 HR 전문가가 되겠습니다.

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

<기타>
${interview.other || ''}`

    return prompt
  } else {
    // Initial generation mode prompt
    const prompt = `다음 JSON 형식으로 정확히 30개 면접 답변을 생성해줘. 선택된 질문을 기준으로 해당 카테고리의 답변을 우선적으로 고려하되, 모든 카테고리의 답변을 생성해야 함.

[선택된 질문들]
${JSON.stringify(questionData, null, 2)}

[JSON 출력 형식]
{
  "general_personality": [
    "1분 자기소개 답변",
    "답변 2",
    "답변 3",
    "답변 4",
    "답변 5",
    "답변 6",
    "답변 7",
    "답변 8",
    "답변 9",
    "답변 10"
  ],
  "cover_letter_personality": [10개],
  "cover_letter_competency": [10개]
}

[답변 카테고리별 특성]
- general_personality: 자기소개서와 무관
- cover_letter_personality: 자기소개서와 관련
- cover_letter_competency: 자기소개서와 관련

[기본 원칙]
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 직관적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨
- 답변은 400자 이상으로 구성해야
- 분량은 450-500자 사이로 맞춰야
- 1분 자기소개는 "1분 자기소개 쓸 때 참고할 것"에 있는 좋은 사례의 구성과 흐름을 참고해서 쓰도록 해야. 하지만 해당 사례의 내용은 절대 섞지 말 것.

[1분 자기소개 쓸 때 참고할 좋은 예]
안녕하십니까? 저는 "현장의 실제 필요에 맞춰 HR 솔루션을 최적화하는" 지원자 OOO입니다. 
SK텔레콤 신입 교육 운영 시, 100명 이상 교육생의 개별 문의와 돌발적인 장비 문제를 실시간 해결하며 복잡한 일정을 완수했습니다. 이때 강사진, IT팀과의 즉각적인 공조와 사전에 여러 시나리오를 가정한 비상 계획 덕분에 교육 몰입도를 지킬 수 있었고, '치밀한 준비'와 '유연한 현장력'의 시너지를 통해 최적의 HR 지원이 가능함을 체감했습니다.
씨드콥 노인 안전 교육 PM으로서는 어르신들의 시각적 인지 특성을 고려해 영상 자료의 글자 크기와 재생 속도까지 세밀하게 조절하는 등, 사용자의 미세한 필요에 맞춤 기획이 실제 교육 참여도와 안전 행동 변화로 이어짐을 경험했습니다.
저는 이처럼 '사람' 중심의 섬세한 관찰과 분석으로 HR 문제를 해결하고, 구성원이 실질적으로 체감하는 지원을 실현하는 데 집중합니다. 저의 현장 중심 문제 해결력과 운영 경험은 기아 파워트레인이 급변하는 환경 속에서도 구성원 역량을 효과적으로 결집하고, 현장이 만족하는 HR 시스템을 만드는 데 기여할 것입니다. 기아의 성장에 실질적 힘을 보태는, 믿을 수 있는 HR 전문가가 되겠습니다.

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

<기타>
${interview.other || ''}

[개선 요청]
${comment || '없음'}`

    return prompt
  }
}

async function generateAnswerWithGemini(prompt: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...')
  console.log('Answer prompt length:', prompt.length)

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

// TEMPORARY: Bypass signature verification for debugging  
// export const POST = verifySignatureAppRouter(handler, { clockTolerance: 30000 })
export const POST = handler