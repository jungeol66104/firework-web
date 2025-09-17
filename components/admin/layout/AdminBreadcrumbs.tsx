"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
  isActive?: boolean
}

export const AdminBreadcrumbs: React.FC = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with Users
    breadcrumbs.push({
      label: '사용자',
      href: '/admin/users'
    })

    if (pathname.startsWith('/admin/interviews')) {
      const userId = searchParams.get('user_id')
      breadcrumbs.push({
        label: '면접',
        href: userId ? `/admin/interviews?user_id=${userId}` : '/admin/interviews'
      })
    }

    if (pathname.startsWith('/admin/questions')) {
      const userId = searchParams.get('user_id')
      const interviewId = searchParams.get('interview_id')

      if (userId) {
        breadcrumbs.push({
          label: '면접',
          href: `/admin/interviews?user_id=${userId}`
        })
      }

      breadcrumbs.push({
        label: '질문',
        href: interviewId ? `/admin/questions?interview_id=${interviewId}` : '/admin/questions'
      })
    }

    if (pathname.startsWith('/admin/answers')) {
      const userId = searchParams.get('user_id')
      const interviewId = searchParams.get('interview_id')
      const questionId = searchParams.get('question_id')

      if (userId) {
        breadcrumbs.push({
          label: '면접',
          href: `/admin/interviews?user_id=${userId}`
        })
      }

      if (interviewId) {
        breadcrumbs.push({
          label: '질문',
          href: `/admin/questions?interview_id=${interviewId}`
        })
      }

      breadcrumbs.push({
        label: '답변',
        href: questionId ? `/admin/answers?question_id=${questionId}` : '/admin/answers'
      })
    }

    // Mark the last item as active
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].isActive = true
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null // Don't show breadcrumbs for single items
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.href}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            {item.isActive ? (
              <span className="font-medium text-gray-900">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  )
}