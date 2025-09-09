import { getCurrentUserProfileServer, getUserTokensServer } from "@/lib/supabase/services/serverServices"
import { createClient } from "@/lib/supabase/clients/server"
import InterviewsSection from "@/components/dashboard/interviewsSection"
import ProfileSection from "@/components/dashboard/profileSection"
import DashboardTableOfContents from "@/components/dashboard/dashboardTableOfContents"
import DashboardNavBar from "@/components/dashboard/dashboardNavBar"

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
    <>
      {/* Dashboard-specific navbar with table of contents */}
      <DashboardNavBar />
      
      <div className="min-h-screen">
        {/* Desktop layout with sidebar */}
        <div className="hidden sm:flex sm:justify-center sm:items-start sm:gap-4">
          <div className="w-full max-w-4xl flex gap-4">
            <div className="w-full flex flex-col justify-center items-center gap-4">
              <InterviewsSection />
              <ProfileSection userName={userName} userEmail={userEmail} tokens={tokens} />
            </div>
            <DashboardTableOfContents />
          </div>
        </div>
        
        {/* Mobile content */}
        <div className="sm:hidden">
          <div className="flex flex-col items-center">
            <div className="w-full">
              <InterviewsSection />
            </div>
            <div className="w-full">
              <ProfileSection userName={userName} userEmail={userEmail} tokens={tokens} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
