import { getCurrentUserProfileServer, getUserTokensServer } from "@/utils/supabase/services/serverServices"
import { createClient } from "@/utils/supabase/clients/server"
import InterviewsSection from "@/components/dashboard/interviewsSection"
import ProfileSection from "@/components/dashboard/profileSection"
import DashboardTableOfContents from "@/components/dashboard/dashboardTableOfContents"

export default async function Dashboard() {
  const profile = await getCurrentUserProfileServer()
  const userName = profile?.name || "사용자"
  
  // Get email from auth user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email
  
  // Get user tokens
  const tokens = await getUserTokensServer()

  return (
    <div className="flex justify-center items-center gap-4">
      <div className="w-full max-w-4xl flex gap-4">
        <div className="w-full flex flex-col justify-center items-center gap-4">
          <InterviewsSection />
          <ProfileSection userName={userName} userEmail={userEmail} tokens={tokens} />
          <div className="h-[462px]"></div>
        </div>
        <DashboardTableOfContents />
      </div>
    </div>
  )
}
