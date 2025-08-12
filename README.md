This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

Before running the application, you need to set up the following environment variables:

1. Copy the example environment file: `cp env.example .env.local`
2. Update the `.env.local` file with your actual API keys:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key
```

### Getting the API Keys:

- **Supabase**: Create a project at [supabase.com](https://supabase.com) and get your project URL and API keys from the project settings
- **Google Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features

### AI-Powered Interview Question Generation

The application includes an AI-powered feature that generates personalized interview questions using Google Gemini 2.5 Pro based on:

- Company information
- Job position details
- User-provided comments

To use this feature:

1. Fill in the interview information in the "정보" section
2. Navigate to the "질문" section
3. Optionally add a comment to guide the question generation
4. Click the "생성" button to generate comprehensive interview questions using Gemini Pro 2.5

The generated questions are saved to the database and can be viewed in the history section.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
