import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createAdminClient } from '@/lib/supabase/clients/admin'
import { fetchInterviewByIdServer, fetchInterviewQuestionsServer } from '@/lib/supabase/services/serverServices'
import { checkTokenBalance, spendTokens, refundTokens } from '@/lib/supabase/services/tokenService'
import { createNotification } from '@/lib/supabase/services/notificationService'
import { NOTIFICATION_MESSAGES } from '@/lib/constants'
import { GoogleGenAI, Type } from "@google/genai"

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, userId, interviewId, inputData } = body
    const { selectedQuestions, comment } = inputData || {}

    console.log('Processing answer generation job:', jobId)
    console.log('Selected questions:', selectedQuestions?.length || 0)

    // Get supabase client
    const supabase = createAdminClient()

    // Mark job as processing
    const { error: processingError } = await supabase
      .from('interview_qa_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    if (processingError) {
      console.error('Failed to mark job as processing:', processingError)
      throw new Error(`Failed to update job status: ${processingError.message}`)
    }
    console.log('Job marked as processing:', jobId)

    // STEP 1: Calculate token cost based on selected questions (after validation)
    let tokenCost = 0

    try {
      // Validate selectedQuestions FIRST (before charging)
      if (!selectedQuestions || selectedQuestions.length === 0) {
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'No questions selected' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'No questions selected' }, { status: 400 })
      }

      // Calculate token cost
      tokenCost = (selectedQuestions.length / 30) * 6
      console.log(`Token cost for ${selectedQuestions.length} questions: ${tokenCost} tokens`)

      // STEP 2: Check token balance BEFORE any work
      const hasEnoughTokens = await checkTokenBalance(supabase, userId, tokenCost)
      if (!hasEnoughTokens) {
        console.error('Insufficient tokens for job', jobId, '- required:', tokenCost)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Insufficient tokens' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Insufficient tokens' }, { status: 402 })
      }

      // STEP 3: Spend tokens UPFRONT (charge user before work)
      const tokenSpent = await spendTokens(supabase, userId, tokenCost)
      if (!tokenSpent) {
        console.error('Failed to spend tokens for job', jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Token deduction failed' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Token deduction failed' }, { status: 500 })
      }

      console.log(`✅ Charged ${tokenCost} tokens upfront for job`, jobId)

      // Fetch the interview data
      const interview = await fetchInterviewByIdServer(interviewId, userId)
      if (!interview) {
        // Refund tokens since we failed before generation
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Interview not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
      }

      // Fetch the default QA record with questions
      const { data: qa, error: qaError } = await supabase
        .from('interview_qas')
        .select('*')
        .eq('interview_id', interviewId)
        .eq('is_default', true)
        .single()

      if (qaError || !qa || !qa.questions_data) {
        // Refund tokens since we failed before generation
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'QA record not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'QA record not found' }, { status: 404 })
      }

      const questionData = qa.questions_data

      // Prepare the prompt with only selected questions
      const prompt = generatePrompt(interview, selectedQuestions, comment)
      console.log('Generated answer prompt for job', jobId, 'length:', prompt.length)

      // STEP 4: Generate with Gemini (user already paid)
      const answer = await generateAnswerWithGemini(prompt)
      console.log('Generated answer for job', jobId, 'length:', answer.length)

      // Parse and validate JSON response
      let llmAnswers: any = null
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

        llmAnswers = JSON.parse(jsonString)

        // Validate structure - expecting { answers: [{category, index, answer}] }
        if (!llmAnswers.answers || !Array.isArray(llmAnswers.answers)) {
          throw new Error('Invalid JSON structure: missing answers array')
        }

        // Validate each answer
        for (const ans of llmAnswers.answers) {
          if (!ans.category || !['general_personality', 'cover_letter_personality', 'cover_letter_competency'].includes(ans.category)) {
            throw new Error(`Invalid category: ${ans.category}`)
          }
          if (typeof ans.index !== 'number' || ans.index < 0 || ans.index > 9) {
            throw new Error(`Invalid index: ${ans.index}`)
          }
          if (typeof ans.answer !== 'string' || ans.answer.trim().length === 0) {
            throw new Error('Invalid answer text')
          }
        }

        console.log('JSON validation passed for job', jobId, '- received', llmAnswers.answers.length, 'answers')

      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        // Refund tokens on parsing failure
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to JSON parsing error for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Failed to generate valid JSON answers' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Merge LLM answers into existing answers (preserve previous answers)
      const existingAnswers = qa.answers_data || {
        general_personality: Array(10).fill(null),
        cover_letter_personality: Array(10).fill(null),
        cover_letter_competency: Array(10).fill(null)
      }

      const answerData = {
        general_personality: [...existingAnswers.general_personality],
        cover_letter_personality: [...existingAnswers.cover_letter_personality],
        cover_letter_competency: [...existingAnswers.cover_letter_competency]
      }

      llmAnswers.answers.forEach((ans: any) => {
        answerData[ans.category as keyof typeof answerData][ans.index] = ans.answer
      })

      console.log('Merged answers for job', jobId)

      // Update the QA record with answers
      // Set current default to non-default
      await supabase
        .from('interview_qas')
        .update({ is_default: false })
        .eq('interview_id', interviewId)
        .eq('is_default', true)

      // Create new QA record with both questions and answers as new default
      const { data: savedQA, error: saveError } = await supabase
        .from('interview_qas')
        .insert({
          interview_id: interviewId,
          name: comment || '답변지 생성',
          questions_data: qa.questions_data,
          answers_data: answerData,
          is_default: true,
          type: 'answers_generated'
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving QA for job', jobId, ':', saveError)
        // Refund tokens on save failure
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to save error for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Failed to save QA to database' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Database save failed' }, { status: 500 })
      }

      // Mark job as completed (tokens already spent)
      const { error: updateError } = await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (updateError) {
        console.error('Failed to mark job as completed:', updateError)
      } else {
        console.log('Job marked as completed in database:', jobId)
      }

      // Create notification for user
      try {
        await createNotification(supabase, {
          user_id: userId,
          type: 'answers_generated',
          message: NOTIFICATION_MESSAGES.answers_generated(interview.company_name || '회사'),
          interview_id: interviewId,
          interview_qas_id: savedQA.id,
          metadata: {
            company_name: interview.company_name
          }
        })
        console.log('Notification created for job:', jobId)
      } catch (notifError) {
        console.error('Failed to create notification for job', jobId, ':', notifError)
        // Don't fail the job if notification creation fails
      }

      console.log('Answer generation job completed successfully:', jobId)
      return NextResponse.json({ success: true, qaId: savedQA.id })

    } catch (error) {
      console.error('Error in answer generation for job', jobId, ':', error)
      // Refund tokens on any failure
      await refundTokens(supabase, userId, tokenCost)
      console.log(`♻️ Refunded ${tokenCost} tokens due to error for job`, jobId)

      await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error processing answer generation job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generatePrompt(interview: any, selectedQuestions: Array<{category: string, index: number, text: string}>, comment?: string): string {
  // Build question list with numbering - include actual index for LLM mapping
  const questionsList = selectedQuestions.map((q, i) => {
    const categoryLabel = q.category === 'general_personality' ? '일반 인성' :
                         q.category === 'cover_letter_personality' ? '자소서 기반 인성' :
                         '자소서 기반 역량'
    return `${i + 1}. [${categoryLabel}] (category: "${q.category}", index: ${q.index}) ${q.text}`
  }).join('\n')

  const prompt = `당신은 면접 답변을 생성하는 전문가입니다.
아래 선택된 질문들에 대해 답변을 생성해주세요.

[사용자 정보]
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

[답변할 질문 목록] (총 ${selectedQuestions.length}개)
${questionsList}

[답변 요구사항]
- 각 답변은 450-500자
- 두괄식 구성 (결론을 먼저 말하고 근거를 설명)
- 구체적 경험과 수치 포함
- 논리적이고 직관적인 흐름
- 채점 항목을 고려하여 작성
- 경험이 없는 내용은 지어내지 말고, 디테일이 부족한 경우만 보완

[1분 자기소개 작성 시 참고 (구조만 참고, 내용은 절대 복사 금지)]
안녕하십니까? 저는 "현장의 실제 필요에 맞춰 HR 솔루션을 최적화하는" 지원자 OOO입니다.
SK텔레콤 신입 교육 운영 시, 100명 이상 교육생의 개별 문의와 돌발적인 장비 문제를 실시간 해결하며 복잡한 일정을 완수했습니다. 이때 강사진, IT팀과의 즉각적인 공조와 사전에 여러 시나리오를 가정한 비상 계획 덕분에 교육 몰입도를 지킬 수 있었고, '치밀한 준비'와 '유연한 현장력'의 시너지를 통해 최적의 HR 지원이 가능함을 체감했습니다.
씨드콥 노인 안전 교육 PM으로서는 어르신들의 시각적 인지 특성을 고려해 영상 자료의 글자 크기와 재생 속도까지 세밀하게 조절하는 등, 사용자의 미세한 필요에 맞춤 기획이 실제 교육 참여도와 안전 행동 변화로 이어짐을 경험했습니다.
저는 이처럼 '사람' 중심의 섬세한 관찰과 분석으로 HR 문제를 해결하고, 구성원이 실질적으로 체감하는 지원을 실현하는 데 집중합니다. 저의 현장 중심 문제 해결력과 운영 경험은 기아 파워트레인이 급변하는 환경 속에서도 구성원 역량을 효과적으로 결집하고, 현장이 만족하는 HR 시스템을 만드는 데 기여할 것입니다. 기아의 성장에 실질적 힘을 보태는, 믿을 수 있는 HR 전문가가 되겠습니다.

[사용자 추가 요청]
${comment || '없음'}

[출력 형식]
각 질문에 대해 category, index, answer를 포함한 JSON 배열로 반환해주세요.
**중요**: index는 질문 목록에 표시된 "(category: "xxx", index: N)" 부분의 N 값을 정확히 사용해야 합니다.

예시:
만약 질문이 "1. [일반 인성] (category: "general_personality", index: 2) 질문내용" 이라면:
{
  "answers": [
    {
      "category": "general_personality",
      "index": 2,
      "answer": "안녕하십니까? 저는..."
    }
  ]
}

위 질문 목록의 순서대로 정확히 ${selectedQuestions.length}개의 답변을 생성해주세요.
각 답변의 category와 index는 질문 목록에 명시된 값을 그대로 사용하세요.`

  return prompt
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
          answers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: ["general_personality", "cover_letter_personality", "cover_letter_competency"]
                },
                index: {
                  type: Type.NUMBER
                },
                answer: {
                  type: Type.STRING
                }
              },
              required: ["category", "index", "answer"]
            }
          }
        },
        required: ["answers"]
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

// Signature verification enabled - QStash will verify requests using signing keys
export const POST = verifySignatureAppRouter(handler, { clockTolerance: 30000 })