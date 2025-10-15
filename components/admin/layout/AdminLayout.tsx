"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import { AdminNav } from './AdminNav'

interface AdminLayoutProps {
  children: React.ReactNode
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const pathname = usePathname()

  // Hide nav for report detail pages
  const hideNav = pathname?.includes('/admin/reports/') && pathname?.split('/').length > 3

  if (hideNav) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="flex justify-center">
        <div className="w-full max-w-4xl p-4">
          {children}
        </div>
      </main>
    </div>
  )
}