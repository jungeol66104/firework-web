"use client"

import React from 'react'
import { AdminNav } from './AdminNav'

interface AdminLayoutProps {
  children: React.ReactNode
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
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