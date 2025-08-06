"use client"

import { useState, useEffect } from "react"

interface DashboardTableOfContentsProps {
  className?: string
}

export default function DashboardTableOfContents({ className = "" }: DashboardTableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>("interviews")

  const sections = [
    { id: "interviews", label: "면접 내역" },
    { id: "profile", label: "프로필" }
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const elementPosition = element.offsetTop - 60
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth"
      })
    }
  }

  const handleClick = (sectionId: string) => {
    setActiveSection(sectionId)
    scrollToSection(sectionId)
  }

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100 // Offset for better detection

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [sections])

  return (
    <div className={`w-[95px] sticky top-[60px] h-fit py-8 ${className}`}>
      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={`cursor-pointer block w-full text-left text-sm transition-colors duration-200 ${
              activeSection === section.id
                ? "text-black font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  )
} 