"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Hexagon, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentAdminUser } from "@/lib/admin/adminAuthClient"
import { createClient } from "@/lib/supabase/clients/client"
import { User } from "@supabase/supabase-js"
import { Profile } from "@/lib/types"

export const AdminNav: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const { user: adminUser, profile: adminProfile } = await getCurrentAdminUser()
        setUser(adminUser)
        setProfile(adminProfile)
      } catch (error) {
        console.error("Admin access denied:", error)
        // Redirect to dashboard if not admin
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading || !user || !profile) {
    return (
      <div className="sticky top-0 z-10 w-full max-w-4xl mx-auto bg-white/40 backdrop-blur-sm">
        <div className="h-[60px] px-4 flex items-center justify-between">
          <div className="text-lg font-bold">어드민</div>
          <div className="animate-pulse w-20 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/admin/users', label: '사용자' },
    { href: '/admin/interviews', label: '면접' },
    { href: '/admin/qas', label: '질의응답' },
    { href: '/admin/reports', label: '신고' },
    { href: '/admin/payments', label: '결제' },
  ]

  return (
    <div className="sticky top-0 z-10 w-full max-w-4xl mx-auto bg-white/40 backdrop-blur-sm">
      <div className="h-[60px] px-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/users" className="text-lg font-bold">
            어드민
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors duration-200 ${
                  pathname.startsWith(item.href)
                    ? 'text-black font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="sm:px-3 px-0 sm:hover:bg-gray-100 hover:bg-transparent rounded-none">
            {/* Mobile: First letter with border */}
            <div className="sm:hidden w-8 h-8 rounded-full border border-blue-300 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {profile.name?.charAt(0) || 'A'}
              </span>
            </div>
            {/* Desktop: Full name with admin indicator */}
            <span className="hidden sm:block text-sm font-medium text-blue-700">
              관리자 {profile.name}님
            </span>
          </Button>

          <Button
            variant="outline"
            className="sm:px-3 sm:py-1 sm:h-8 sm:w-auto w-8 h-8 p-0 text-sm flex items-center justify-center gap-2 rounded-none"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </div>
    </div>
  )
}