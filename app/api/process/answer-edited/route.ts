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

    console.log('Processing answer edit job:', jobId)
    console.log('Edit params:', { category, index, comment })

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

    // STEP 1: Token cost for answer edit is 0.2
    const tokenCost = 0.2

    try {

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

      // Fetch the default QA record with questions and answers
      const { data: qa, error: qaError } = await supabase
        .from('interview_qas')
        .select('*')
        .eq('interview_id', interviewId)
        .eq('is_default', true)
        .single()

      if (qaError || !qa || !qa.questions_data || !qa.answers_data) {
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'QA record not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'QA record not found' }, { status: 404 })
      }

      const questionData = qa.questions_data
      const answerData = qa.answers_data

      // Get the current question and answer
      const currentQuestion = questionData[category]?.[index]
      const currentAnswer = answerData[category]?.[index]

      if (!currentQuestion || !currentAnswer) {
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Question or Answer not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Question or Answer not found' }, { status: 400 })
      }

      // Prepare the prompt
      const prompt = generateEditPrompt(interview, category, currentQuestion, currentAnswer, comment)
      console.log('Generated edit prompt for job', jobId, 'length:', prompt.length)

      // STEP 4: Generate with Gemini (user already paid)
      const editedAnswer = await generateWithGemini(prompt, 'answer')
      console.log('Generated edited answer for job', jobId, 'length:', editedAnswer.length)

      // Parse and validate JSON response
      let llmResponse: any = null
      try {
        let jsonString = editedAnswer.trim()

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

        // Validate structure - expecting { answer: "..." }
        if (!llmResponse.answer || typeof llmResponse.answer !== 'string' || llmResponse.answer.trim().length === 0) {
          throw new Error('Invalid JSON structure: missing answer field')
        }

        console.log('JSON validation passed for job', jobId)

      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to JSON parsing error for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Failed to generate valid JSON answer' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Update the answer in the data structure
      const updatedAnswerData = {
        ...answerData,
        [category]: [
          ...answerData[category].slice(0, index),
          llmResponse.answer,
          ...answerData[category].slice(index + 1)
        ]
      }

      console.log('Updated answer for job', jobId)

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

      // Build target_items - one answer was edited
      const target_items = {
        questions: [],
        answers: [{ category, index }]
      }

      // Create new QA record with edited answer as new default
      const { data: savedQA, error: saveError } = await supabase
        .from('interview_qas')
        .insert({
          interview_id: interviewId,
          name: comment || '답변 수정',
          questions_data: qa.questions_data, // Preserve existing questions
          answers_data: updatedAnswerData,
          is_default: true,
          type: 'answer_edited',
          parent_qa_id: currentDefault?.id || null,
          target_items,
          tokens_used: 0.2
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
          type: 'answer_edited',
          message: NOTIFICATION_MESSAGES.answer_edited(interview.company_name || '회사', index),
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

      console.log('Answer edit job completed successfully:', jobId)
      return NextResponse.json({ success: true, qaId: savedQA.id })

    } catch (error) {
      console.error('Error in answer edit for job', jobId, ':', error)
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
    console.error('Error processing answer edit job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateEditPrompt(interview: any, category: string, question: string, currentAnswer: string, comment?: string): string {
  const categoryLabel = category === 'general_personality' ? '일반 인성' :
                        category === 'cover_letter_personality' ? '자소서 기반 인성' :
                        '자소서 기반 역량'

  const prompt = `당신은 면접 답변을 수정하는 전문가입니다.
아래 기존 답변을 수정해주세요.

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

[질문]
${question}

[현재 답변]
${currentAnswer}

[수정 요청사항]
${comment || '답변의 핵심 내용을 유지하면서 더 효과적으로 수정해주세요.'}

[수정 요구사항]
- 답변은 450-500자
- 두괄식 구성 (결론을 먼저 말하고 근거를 설명)
- 구체적 경험과 수치 포함
- 논리적이고 직관적인 흐름
- 채점 항목을 고려하여 작성
- 경험이 없는 내용은 지어내지 말고, 디테일이 부족한 경우만 보완

[출력 형식]
수정된 답변을 JSON 형식으로 반환해주세요.

예시:
{
  "answer": "수정된 답변 내용"
}

수정된 답변 1개만 생성해주세요.`

  return prompt
}

// Signature verification enabled - QStash will verify requests using signing keys
export const POST = verifySignatureAppRouter(handler, { clockTolerance: 30000 })
