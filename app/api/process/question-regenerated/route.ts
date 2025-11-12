import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createAdminClient } from '@/lib/supabase/clients/admin'
import { fetchInterviewByIdServer } from '@/lib/supabase/services/serverServices'
import { checkTokenBalance, spendTokens, refundTokens } from '@/lib/supabase/services/tokenService'
import { createNotification } from '@/lib/supabase/services/notificationService'
import { NOTIFICATION_MESSAGES } from '@/lib/constants'
import { generateWithGemini } from '@/lib/gemini/client'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, userId, interviewId, inputData } = body
    const { category, index, comment } = inputData || {}

    console.log('Processing question regenerate job:', jobId)
    console.log('Regenerate params:', { category, index, comment })

    // Get supabase admin client (needed for QStash webhooks without auth)
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

    // STEP 1: Token cost for question regenerate is 0.1
    const tokenCost = 0.1

    try{

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

      // STEP 3: Spend tokens UPFRONT
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
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'QA record not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'QA record not found' }, { status: 404 })
      }

      const questionData = qa.questions_data

      // Get the current question as reference
      const previousQuestion = questionData[category]?.[index]
      if (!previousQuestion) {
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Question not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Question not found' }, { status: 400 })
      }

      // Prepare the prompt
      const prompt = generateRegeneratePrompt(interview, category, previousQuestion, comment)
      console.log('Generated regenerate prompt for job', jobId, 'length:', prompt.length)

      // STEP 4: Generate with Gemini (user already paid)
      const regeneratedQuestion = await generateWithGemini(prompt, 'question')
      console.log('Generated regenerated question for job', jobId, 'length:', regeneratedQuestion.length)

      // Parse and validate JSON response
      let llmResponse: any = null
      try {
        let jsonString = regeneratedQuestion.trim()

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

        llmResponse = JSON.parse(jsonString)

        // Validate structure - expecting { question: "..." }
        if (!llmResponse.question || typeof llmResponse.question !== 'string' || llmResponse.question.trim().length === 0) {
          throw new Error('Invalid JSON structure: missing question field')
        }

        console.log('JSON validation passed for job', jobId)

      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to JSON parsing error for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Failed to generate valid JSON question' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Update the question in the data structure
      const updatedQuestionData = {
        ...questionData,
        [category]: [
          ...questionData[category].slice(0, index),
          llmResponse.question,
          ...questionData[category].slice(index + 1)
        ]
      }

      console.log('Updated question for job', jobId)

      // Clear the corresponding answer since the question changed
      const emptyAnswers = {
        general_personality: Array(10).fill(null),
        cover_letter_personality: Array(10).fill(null),
        cover_letter_competency: Array(10).fill(null)
      }

      const updatedAnswerData = qa.answers_data ? {
        ...qa.answers_data,
        [category]: [
          ...qa.answers_data[category].slice(0, index),
          null, // Clear answer for the regenerated question
          ...qa.answers_data[category].slice(index + 1)
        ]
      } : emptyAnswers

      // Unset current default and get its ID for parent reference
      const { data: currentDefault } = await supabase
        .from('interview_qas')
        .select('id')
        .eq('interview_id', interviewId)
        .eq('is_default', true)
        .single()

      await supabase
        .from('interview_qas')
        .update({ is_default: false })
        .eq('interview_id', interviewId)
        .eq('is_default', true)

      // Build target_items - one question was regenerated
      const target_items = {
        questions: [{ category, index }],
        answers: []
      }

      // Create new QA record with regenerated question as new default
      const { data: savedQA, error: saveError } = await supabase
        .from('interview_qas')
        .insert({
          interview_id: interviewId,
          name: comment || '질문 재생성',
          questions_data: updatedQuestionData,
          answers_data: updatedAnswerData, // Clear corresponding answer
          is_default: true,
          type: 'question_regenerated',
          parent_qa_id: currentDefault?.id || null,
          target_items,
          tokens_used: 0.1
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving QA for job', jobId, ':', saveError)
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
          type: 'question_regenerated',
          message: NOTIFICATION_MESSAGES.question_regenerated(interview.company_name || '회사', index),
          interview_id: interviewId,
          interview_qas_id: savedQA.id,
          metadata: {
            company_name: interview.company_name,
            category,
            index
          }
        })
        console.log('Notification created for job:', jobId)
      } catch (notifError) {
        console.error('Failed to create notification for job', jobId, ':', notifError)
        // Don't fail the job if notification creation fails
      }

      console.log('Question regenerate job completed successfully:', jobId)
      return NextResponse.json({ success: true, qaId: savedQA.id })

    } catch (error) {
      console.error('Error in question regenerate for job', jobId, ':', error)
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
    console.error('Error processing question regenerate job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateRegeneratePrompt(interview: any, category: string, previousQuestion: string, comment?: string): string {
  const categoryLabel = category === 'general_personality' ? '일반 인성' :
                        category === 'cover_letter_personality' ? '자소서 기반 인성' :
                        '자소서 기반 역량'

  const prompt = `당신은 면접 질문을 재생성하는 전문가입니다.
아래 기존 질문을 참고하여 새로운 질문을 생성해주세요.

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

[질문 카테고리]
${categoryLabel}

[기존 질문 (참고용)]
${previousQuestion}

[재생성 요청사항]
${comment || '기존 질문과 다른 관점에서 새로운 질문을 생성해주세요.'}

[재생성 요구사항]
- 기존 질문과는 다른 각도에서 접근하되, 같은 카테고리(${categoryLabel})에 적합한 질문 생성
- **중요**: 만약 카테고리가 "일반 인성"인 경우, 자기소개서/이력서/회사정보 등 사용자가 업로드한 구체적 정보를 절대 사용하지 말고 일반적이고 보편적인 질문으로만 생성할 것
- 카테고리가 "자소서 기반 인성" 또는 "자소서 기반 역량"인 경우에만 사용자 정보를 반영하여 구체적이고 실질적인 질문 작성
- 면접관이 실제로 물어볼 법한 자연스러운 표현 사용
- 기존 질문의 내용을 단순히 바꾸는 것이 아니라, 완전히 새로운 질문 생성

[출력 형식]
새로 생성된 질문을 JSON 형식으로 반환해주세요.

예시:
{
  "question": "새로 생성된 질문 내용"
}

새로운 질문 1개만 생성해주세요.`

  return prompt
}

// Signature verification enabled - QStash will verify requests using signing keys
export const POST = verifySignatureAppRouter(handler, { clockTolerance: 30000 })
