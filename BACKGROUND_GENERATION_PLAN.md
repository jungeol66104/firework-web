# Background Q&A Generation Implementation Plan

## Overview
Convert blocking Q&A generation (1+ minute wait times) to non-blocking background processing using Upstash QStash + Vercel serverless functions.

## Architecture
```
User clicks "생성" → Queue job → Return immediately → Background processing → Store results
```

## Current Progress ✅
1. ✅ **Upstash QStash Setup** - Credentials obtained
2. ✅ **Dependencies** - `@upstash/qstash` installed  
3. ✅ **Database** - `generation_jobs` table created
4. ✅ **Job Management** - `JobManager` class created

## Environment Variables (Already Set)
```env
QSTASH_URL="https://qstash.upstash.io"
QSTASH_TOKEN="eyJVc2VySUQiOiI5NTE3MDE0NS1hMDc3LTRhOGEtYmNlMy05M2I3NDc4YzcyNzAiLCJQYXNzd29yZCI6IjJiYjk3Y2Y0NDczMjQzMDhhMDM3MmMwZTM5MmE1MjI4In0="
QSTASH_CURRENT_SIGNING_KEY="sig_51TENMhCUmu3dAi61D6ankMTiL33"  
QSTASH_NEXT_SIGNING_KEY="sig_6hJvYRSvQbHZ2cKhdSxRLXPaTaFe"
```

## Database Schema (Created)
```sql
generation_jobs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  interview_id uuid REFERENCES interviews(id), 
  type text ('question' | 'answer'),
  status text ('queued' | 'processing' | 'completed' | 'failed'),
  question_id uuid REFERENCES interview_questions(id), -- for answers
  comment text,
  result jsonb,
  error_message text,
  created_at timestamp,
  completed_at timestamp
)
```

## Remaining Implementation Steps

### 5. Create QStash Queue Utility
- **File**: `lib/jobs/queueManager.ts`
- **Purpose**: Send jobs to QStash for processing
- **Functions**: `queueQuestionGeneration()`, `queueAnswerGeneration()`

### 6. Modify Existing API Routes (Make Non-Blocking)
- **Files**: 
  - `app/api/ai/question/route.ts` → Queue job, return jobId
  - `app/api/ai/answer/route.ts` → Queue job, return jobId
- **Changes**: Replace blocking generation with job queuing

### 7. Create Processing Endpoints (Called by QStash)
- **Files**:
  - `app/api/process/question/route.ts` → Actual Gemini generation
  - `app/api/process/answer/route.ts` → Actual Gemini generation  
- **Purpose**: Background workers that do the heavy lifting

### 8. Add Job Status API
- **File**: `app/api/jobs/[jobId]/route.ts`
- **Purpose**: Check job status and retrieve results

### 9. Update Zustand Store
- **File**: `lib/zustand.ts`
- **Add States**: `activeJobs`, `jobPolling`, job management functions
- **Purpose**: Track generation status across components

### 10. Remove Blocking UI (Questions)
- **File**: `components/interviews/questions/questionsSection.tsx`
- **Changes**: 
  - Remove `showLoadingDialog` and blocking AlertDialog
  - Add job status polling
  - Show inline loading states

### 11. Remove Blocking UI (Answers)
- **File**: `components/interviews/answers/answersSection.tsx` 
- **Changes**:
  - Remove `showLoadingDialog` and blocking AlertDialog
  - Add job status polling
  - Show inline loading states

### 12. Update Data Tables
- **Files**: 
  - `components/interviews/questions/questionsDataTable.tsx`
  - `components/interviews/answers/answersDataTable.tsx`
- **Changes**: Add loading rows with spinners for active jobs

## Target UX Flow

### Questions Page After Implementation:
```
User clicks [질문 생성] →
┌─────────────────────────────────────────┐
│ 📋 질문 히스토리                         │
├─────────────────────────────────────────┤
│ 🔄 생성 중... (1분 30초 경과)            │ ← Loading row
│    AI가 맞춤형 질문을 생성하고 있습니다   │
├─────────────────────────────────────────┤
│ ✅ 질문 세트 #2 (2024-08-27 14:30)      │
└─────────────────────────────────────────┘

🟢 Toast: "질문 생성을 시작했습니다!"
[질문 생성] button → DISABLED ("생성 중...")
```

### Key UX Features:
- ✅ No blocking modals - user can navigate freely
- ✅ Visual progress with elapsed time
- ✅ Generation persists even if browser closes
- ✅ Smart button disabling (only one generation at a time)
- ✅ Toast notifications for status updates
- ✅ Recovery - shows status after browser restart

## Technical Implementation Notes

### Job Flow:
1. **User Request** → Create job in DB + Queue to QStash → Return jobId
2. **QStash Processing** → Call processing endpoint → Update job status
3. **Frontend Polling** → Check job status every 5s → Update UI
4. **Completion** → Show results + refresh data

### Error Handling:
- Network failures → Retry mechanism in QStash
- Generation failures → Mark job as failed, allow retry
- Browser closes → Job continues, recovers on return

### Performance Optimizations:
- Only poll for active jobs
- Cleanup completed jobs after 7 days
- Prevent multiple concurrent generations per user

## Files Created So Far:
- ✅ `/lib/jobs/jobManager.ts` - Job CRUD operations

## Files To Create:
- `/lib/jobs/queueManager.ts` - QStash integration
- `/app/api/process/question/route.ts` - Background question processing
- `/app/api/process/answer/route.ts` - Background answer processing  
- `/app/api/jobs/[jobId]/route.ts` - Job status API

## Files To Modify:
- `/app/api/ai/question/route.ts` - Make non-blocking
- `/app/api/ai/answer/route.ts` - Make non-blocking
- `/lib/zustand.ts` - Add job states
- `/components/interviews/questions/questionsSection.tsx` - Remove blocking dialog
- `/components/interviews/answers/answersSection.tsx` - Remove blocking dialog
- `/components/interviews/questions/questionsDataTable.tsx` - Add loading states
- `/components/interviews/answers/answersDataTable.tsx` - Add loading states

## Testing Checklist:
- [ ] Generate questions with browser open
- [ ] Generate questions, close browser, reopen - job continues
- [ ] Generate answers with browser open  
- [ ] Generate answers, close browser, reopen - job continues
- [ ] Error handling - failed generations
- [ ] Multiple users - no interference
- [ ] Navigation during generation - UI persists
- [ ] Job cleanup - old jobs removed

---

**Next Step**: Continue with Step 5 - Create QStash Queue Utility