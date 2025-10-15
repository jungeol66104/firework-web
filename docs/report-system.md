# Report System Documentation

## Overview

The Report System allows users to report problematic AI-generated questions and answers. Admins can review these reports and issue token refunds for valid complaints. This system is crucial for maintaining quality control and user trust in the interview preparation platform.

## Key Features

- **Item-Level Reporting**: Users can select specific questions/answers to report
- **Token Refunds**: Automatic token refunds for valid reports (0.1 tokens per question, 0.2 tokens per answer)
- **Status Tracking**: Reports progress through pending → in_review → resolved/rejected
- **Admin Responses**: Admins can add explanatory messages to reports
- **Trust + Context Approach**: Users can report the same item multiple times; admins see full context

---

## Database Schema

### Table: `reports`

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interview_qas_id UUID NOT NULL REFERENCES interview_qas(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_interview_qas_id ON reports(interview_qas_id);
```

### JSONB Structure: `items`

The `items` field contains both reported items and refund tracking:

```json
{
  "questions": [
    {
      "category": "general_personality",
      "index": 0,
      "refunded": true,
      "refund_amount": 0.1,
      "refunded_at": "2025-10-14T06:00:00Z"
    }
  ],
  "answers": [
    {
      "category": "cover_letter_personality",
      "index": 5,
      "refunded": false
    }
  ]
}
```

---

## Architecture

### Type Definitions

Location: `lib/types.ts`

```typescript
export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'rejected'

export interface ReportItem {
  category: string
  index: number
  refunded?: boolean
  refund_amount?: number
  refunded_at?: string
}

export interface ReportItems {
  questions: ReportItem[]
  answers: ReportItem[]
}

export interface Report {
  id: string
  user_id: string
  interview_id: string
  interview_qas_id: string
  items: ReportItems
  description: string
  status: ReportStatus
  admin_response: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateReportParams {
  interview_qas_id: string
  selectedQuestions: string[]
  selectedAnswers: string[]
  description: string
}

export interface UpdateReportParams {
  status?: ReportStatus
  admin_response?: string
}
```

---

## Frontend Components

### 1. Selection Logic (app/interview/page.tsx)

**Refactored State Management:**
- Separated `selectedQuestions` and `selectedAnswers` into distinct Sets
- Combined view using `useMemo` for backward compatibility
- Tracks current Q&A ID via `currentQaId` state

```typescript
const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set())
const [currentQaId, setCurrentQaId] = useState<string | null>(null)

// Combined for display
const selectedItems = useMemo(
  () => new Set([...selectedQuestions, ...selectedAnswers]),
  [selectedQuestions, selectedAnswers]
)
```

**Item ID Format:**
- Questions: `{category}_q_{index}` (e.g., `general_personality_q_0`)
- Answers: `{category}_a_{index}` (e.g., `cover_letter_personality_a_5`)

### 2. Report Button (app/interview/page.tsx)

Located in the "More" (MoreHorizontal) dropdown menu:

```typescript
<DropdownMenuItem
  onClick={() => {
    if (selectedItems.size > 0) {
      setShowReportModal(true)
    }
  }}
  disabled={selectedItems.size === 0}
>
  <Flag className="h-4 w-4 mr-2" />
  문제 신고
</DropdownMenuItem>
```

### 3. ReportModal Component (components/interview/ReportModal.tsx)

**Features:**
- Displays selected items grouped by category
- Shows token refund calculation
- Validates description input
- Submits to POST `/api/reports`

**Props:**
```typescript
interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuestions: Set<string>
  selectedAnswers: Set<string>
  interviewQasId: string | null
  questionData: any
  answerData: any
  onSuccess?: () => void
}
```

### 4. ReportsSection Component (components/dashboard/reportsSection.tsx)

**Dashboard Integration:**
- Displays user's report history
- Shows status badges with appropriate colors
- Displays refunded token amounts
- Shows admin responses when available

**Status Display:**
- `pending`: Secondary badge - "검토 대기 중"
- `in_review`: Default badge - "검토 중"
- `resolved`: Outline badge - "해결됨"
- `rejected`: Destructive badge - "반려됨"

---

## Backend Services

### Core Services (lib/supabase/services/services.ts)

#### `createReport(supabase, params)`
- Validates authentication
- Fetches interview_id from interview_qas
- Parses selected items into ReportItems structure
- Creates report with 'pending' status

#### `fetchCurrentUserReports(supabase)`
- Returns all reports for authenticated user
- Ordered by created_at descending

#### `fetchReportById(supabase, reportId)`
- Fetches single report by ID
- Returns null if not found

#### `updateReport(supabase, reportId, updates)`
- Updates report status and/or admin_response
- Auto-sets resolved_at when status = 'resolved'

#### `fetchAllReports(supabase, status?)`
- Admin function to fetch all reports
- Optional status filter

#### `refundReportItem(supabase, reportId, itemType, category, index)`
- Validates item exists and not already refunded
- Marks item as refunded in JSONB
- Calls `addTokens()` to credit user account
- Returns updated report

### Server Services (lib/supabase/services/serverServices.ts)

Server-side wrappers that create Supabase client and call core services:
- `createReportServer(params)`
- `fetchCurrentUserReportsServer()`
- `fetchReportByIdServer(reportId)`
- `updateReportServer(reportId, updates)`
- `fetchAllReportsServer(status?)`
- `refundReportItemServer(reportId, itemType, category, index)`

### Client Services (lib/supabase/services/clientServices.ts)

Client-side wrappers for use in React components:
- `createReportClient(params)`
- `fetchCurrentUserReportsClient()`
- `fetchReportByIdClient(reportId)`

---

## API Routes

### POST `/api/reports`

**Purpose:** Create a new report

**Request Body:**
```json
{
  "interview_qas_id": "uuid",
  "selectedQuestions": ["general_personality_q_0", "general_personality_q_1"],
  "selectedAnswers": ["cover_letter_personality_a_5"],
  "description": "문제 설명..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "interview_id": "uuid",
  "interview_qas_id": "uuid",
  "items": {
    "questions": [...],
    "answers": [...]
  },
  "description": "...",
  "status": "pending",
  "created_at": "2025-10-14T06:00:00Z",
  ...
}
```

**Validation:**
- Requires authentication
- Validates interview_qas_id exists
- Requires non-empty description
- Requires at least one selected question or answer

### GET `/api/reports`

**Purpose:** Fetch current user's reports

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "pending",
    "items": { ... },
    "description": "...",
    "admin_response": null,
    ...
  }
]
```

### GET `/api/reports/[id]`

**Purpose:** Fetch single report by ID

**Authorization:** Report must belong to authenticated user

**Response:** Single report object or 404

---

## User Flow

### 1. Submitting a Report

1. User navigates to interview Q&A page
2. Selects problematic questions/answers by clicking on them
3. Opens "More" dropdown (MoreHorizontal icon)
4. Clicks "문제 신고" (Report Problem)
5. ReportModal opens showing:
   - Selected items grouped by category
   - Token refund calculation
   - Description textarea
6. User enters problem description
7. Clicks "신고 접수" (Submit Report)
8. System validates and creates report
9. Selections are cleared
10. Success toast confirmation

### 2. Viewing Reports

1. User navigates to Dashboard
2. Scrolls to "신고 내역" (Report History) section
3. Sees list of all their reports with:
   - Status badge
   - Submission date
   - Description preview
   - Item counts (questions/answers)
   - Refunded tokens (if any)
   - Admin response (if provided)

---

## Implementation Details

### Q&A ID Tracking

**Challenge:** The "최신" (latest) view doesn't set `viewingQaId`, so we needed to track the current Q&A ID.

**Solution:**
1. Updated API routes to return Q&A ID:
   ```typescript
   // Before
   return Response.json([{ question_data: qas[0].questions_data }])

   // After
   return Response.json([{
     id: qas[0].id,
     question_data: qas[0].questions_data
   }])
   ```

2. Added `currentQaId` state to track default Q&A
3. ReportModal uses: `viewingQaId || currentQaId`

### Selection Logic Refactor

**Why Separate Sets?**
- "답변지 생성" button only works with questions
- "문제 신고" button works with both questions and answers
- Clearer badge display
- No filtering needed

**Dropdown Menu Actions:**
- "전체 질문 선택" - Adds all 30 question IDs to selectedQuestions
- "전체 답변 선택" - Adds all answer IDs (only those that exist) to selectedAnswers
- "선택 해제" - Clears both Sets

---

## Token Refund Logic

### Pricing
- Question generation: 3 tokens for 30 questions → 0.1 tokens per question
- Answer generation: 6 tokens for 30 answers → 0.2 tokens per answer

### Refund Amounts
- **Question refund:** 0.1 tokens
- **Answer refund:** 0.2 tokens

### Process
1. Admin reviews report
2. For each valid item, admin calls `refundReportItem()`
3. Item is marked as refunded in JSONB
4. Tokens are added back to user's account via `addTokens()`
5. Refund is recorded with timestamp

### Duplicate Prevention
**Approach:** Trust + Context
- No technical prevention of duplicate reports
- Users can report the same item multiple times
- Admin sees full history when viewing reports
- Admin can identify patterns and make informed decisions

---

## Admin Functionality (Pending Implementation)

### Planned Features

1. **Admin Reports Dashboard**
   - List all reports with filtering by status
   - Quick stats (pending count, resolved count)
   - Search by user, interview, or description

2. **Generation Plain Grid View**
   - Shows all Q&A versions side by side
   - Highlights reported items
   - Allows comparison of different versions
   - Quick access to report details

3. **Report Detail Page**
   - Full report information
   - Selected items with original text
   - User information
   - Status management
   - Admin response input
   - Item-by-item refund buttons

4. **Admin Actions**
   - Update status (pending → in_review → resolved/rejected)
   - Add admin response
   - Refund individual items
   - Mark multiple items for batch refund

---

## Error Handling

### Frontend Validation
- ReportModal checks for:
  - Valid interview_qas_id
  - Non-empty description
  - At least one selected item

### API Validation
- Authentication required
- Interview Q&A must exist
- Description must be non-empty string
- At least one question or answer selected

### Error Messages
- "면접 질문지를 선택해주세요" - No Q&A ID found
- "문제 설명을 입력해주세요" - Empty description
- "신고할 질문 또는 답변을 선택해주세요" - No items selected
- "신고 접수에 실패했습니다" - Generic error

---

## Testing Checklist

### User Flow Tests
- [ ] Select questions and submit report
- [ ] Select answers and submit report
- [ ] Select both questions and answers
- [ ] Submit report from historical version
- [ ] View reports in dashboard
- [ ] Multiple reports for same interview

### Edge Cases
- [ ] No Q&A data loaded
- [ ] Network error during submission
- [ ] Empty selections
- [ ] Very long description text
- [ ] Special characters in description

### Admin Tests (When Implemented)
- [ ] View all reports
- [ ] Filter by status
- [ ] Update report status
- [ ] Add admin response
- [ ] Refund single item
- [ ] Refund multiple items
- [ ] Verify token balances update

---

## File Structure

```
firework-web/
├── app/
│   ├── api/
│   │   └── reports/
│   │       ├── route.ts              # POST/GET reports
│   │       └── [id]/
│   │           └── route.ts          # GET single report
│   ├── dashboard/
│   │   └── page.tsx                  # Includes ReportsSection
│   └── interview/
│       └── page.tsx                  # Report button + selection logic
├── components/
│   ├── dashboard/
│   │   └── reportsSection.tsx        # User reports list
│   └── interview/
│       └── ReportModal.tsx           # Report submission modal
├── lib/
│   ├── types.ts                      # Report type definitions
│   └── supabase/
│       └── services/
│           ├── services.ts           # Core report functions
│           ├── serverServices.ts     # Server wrappers
│           └── clientServices.ts     # Client wrappers
└── docs/
    └── report-system.md              # This file
```

---

## Future Enhancements

### Phase 1 (Current - MVP)
- ✅ User can submit reports
- ✅ User can view their report history
- ✅ Backend services for report management
- ✅ Token refund logic

### Phase 2 (Next - Admin Interface)
- [ ] Admin reports dashboard
- [ ] Generation Plain grid view
- [ ] Status management interface
- [ ] Bulk refund operations

### Phase 3 (Future)
- [ ] Email notifications for report status changes
- [ ] Analytics dashboard for report trends
- [ ] Automated quality checks before report submission
- [ ] Report templates for common issues
- [ ] Integration with AI model feedback loop

---

## Troubleshooting

### "면접 질문지를 선택해주세요" Error
**Cause:** `currentQaId` is null because Q&A data hasn't loaded yet
**Solution:** Wait for Q&A data to load before opening report modal

### Report Not Showing in Dashboard
**Cause:** Cache issue or API error
**Solution:** Refresh the dashboard page

### Selected Items Not Cleared After Report
**Cause:** `onSuccess` callback not executing
**Solution:** Check for API errors in console

### Duplicate Reports
**Expected Behavior:** Users can report multiple times - this is by design
**Admin Action:** Review context and determine if additional refunds are warranted

---

## Contact & Support

For questions about the report system implementation:
- Review this documentation
- Check `lib/types.ts` for data structures
- Examine API routes in `app/api/reports/`
- Test with dev tools network tab for debugging

---

**Last Updated:** 2025-10-14
**Version:** 1.0 (MVP)
**Status:** Production Ready (User-facing features complete, Admin features pending)
