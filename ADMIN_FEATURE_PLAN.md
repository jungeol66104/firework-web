# Admin Feature Implementation Plan

## Overview
Building an admin panel for managing users, interviews, questions, and answers with drill-down navigation.

## Database Schema
Based on existing Supabase tables:
- `profiles` (users) - 3 rows
- `interviews` - 6 rows (belongs to users)
- `interview_questions` - 9 rows (belongs to interviews)
- `interview_answers` - 7 rows (belongs to questions)
- `payments` - 21 rows
- `generation_jobs` - 42 rows
- `files` - 0 rows

## Admin Authentication Strategy
**Approach:** Simple database field in profiles table
```sql
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

**Auth Utility:**
```typescript
// lib/admin/adminAuth.ts
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfileClient()
  return profile?.is_admin === true
}
```

## URL Structure & Navigation Flow
```
/admin/users                     # Users table with "인터뷰" button
/admin/interviews?user_id=123    # Filtered interviews with "질문" button
/admin/questions?interview_id=456    # Filtered questions with "답변" button
/admin/answers?question_id=789       # Filtered answers
```

**Navigation Pattern:**
- Users table → Click "인터뷰" → Filtered interviews for that user
- Interviews table → Click "질문" → Filtered questions for that interview
- Questions table → Click "답변" → Filtered answers for that question

## Folder Structure
```
app/admin/
├── layout.tsx                   # Admin layout with auth protection
├── users/
│   └── page.tsx                # Users list with "인터뷰" button
├── interviews/
│   └── page.tsx                # Interviews list with "질문" button
├── questions/
│   └── page.tsx                # Questions list with "답변" button
└── answers/
    └── page.tsx                # Answers list

components/admin/
├── layout/
│   ├── AdminLayout.tsx         # Main wrapper
│   ├── AdminNav.tsx            # Navigation bar
│   └── AdminBreadcrumbs.tsx    # Breadcrumb navigation
├── users/
│   ├── UsersDataTable.tsx      # Users table component
│   └── UsersColumns.tsx        # Table column definitions
├── interviews/
│   ├── InterviewsDataTable.tsx # Interviews table component
│   └── InterviewsColumns.tsx   # Table column definitions
├── questions/
│   ├── QuestionsDataTable.tsx  # Questions table component
│   └── QuestionsColumns.tsx    # Table column definitions
├── answers/
│   ├── AnswersDataTable.tsx    # Answers table component
│   └── AnswersColumns.tsx      # Table column definitions
└── shared/
    ├── AdminDataTable.tsx      # Reusable table base
    └── FilterBar.tsx           # Search/filter component

lib/admin/
├── adminServices.ts            # Admin-specific DB operations
└── adminAuth.ts                # Admin authentication
```

## Design System (Match Main App)
**Layout patterns:**
- `min-h-screen` wrapper
- `max-w-4xl` content containers
- `p-4` padding on sections
- Desktop/mobile responsive with `sm:` breakpoints
- Centered content with `flex justify-center`

**Table styling:**
- `rounded-md border` wrapper
- `overflow-x-auto` for mobile scroll
- `hover:bg-muted/50 transition-colors` on rows
- Custom pagination with `ChevronLeft/Right` icons

**Typography:**
- `text-2xl font-bold` for main headings
- `text-sm font-medium` for labels
- Korean text throughout

**Colors:**
- `bg-white/40 backdrop-blur-sm` for navbars
- `bg-blue-600 hover:bg-blue-700` for primary buttons
- `border-gray-300` and `text-gray-600` for subtle elements

## Implementation Steps
1. Add `is_admin` column to profiles table
2. Create admin authentication utilities
3. Build admin layout and navigation
4. Create admin users page with 인터뷰 button
5. Create admin interviews page with 질문 button
6. Create admin questions page with 답변 button
7. Create admin answers page
8. Add admin page protection middleware

## Technical Features
- URL-based filtering with smooth navigation
- Preloading on button hover for performance
- Breadcrumb navigation for context
- Reusable table components
- Consistent styling with main app
- Mobile-responsive design

## Security
- Admin role checking on all admin pages
- Server-side protection in page components
- Admin-only database operations
- Proper error handling for unauthorized access

## Future Enhancements
- Can upgrade to full RBAC with JWT custom claims later
- Add audit logging for admin actions
- Implement more granular permissions
- Add bulk operations for admin tasks

---
*Created: 2025-09-17*
*Status: Ready for implementation*