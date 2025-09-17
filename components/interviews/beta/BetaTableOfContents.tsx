"use client"

import { useState, useEffect } from "react"

interface BetaTableOfContentsProps {
  className?: string
}

export default function BetaTableOfContents({ className = "" }: BetaTableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>("ai-interview")

  const sections = [
    { id: "ai-interview", label: "AI 면접" },
    { id: "information", label: "기본 정보" }
  ]

  const scrollToSection = (sectionId: string) => {
    const isMobile = window.innerWidth < 640 // sm breakpoint

    // For ai-interview, target the questions section instead of the container
    const targetId = sectionId === "ai-interview" ? "questions" : sectionId

    // Get all elements with this ID (there might be duplicates for mobile/desktop)
    const elements = document.querySelectorAll(`#${targetId}`)

    // Find the visible element
    let targetElement = null
    for (const element of elements) {
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)

      // Check if element is visible (has dimensions and not display:none)
      if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
        targetElement = element
        break
      }
    }

    if (targetElement) {
      const offset = isMobile ? 96 : 60

      // Calculate position using getBoundingClientRect for accuracy
      const rect = targetElement.getBoundingClientRect()
      const elementTop = rect.top + window.pageYOffset
      const scrollPosition = Math.max(0, elementTop - offset)

      console.log('Found visible element for:', sectionId, 'Scrolling to:', scrollPosition)

      window.scrollTo({
        top: scrollPosition,
        behavior: "smooth"
      })
    } else {
      console.log('No visible element found for:', sectionId)
    }
  }

  const handleClick = (sectionId: string) => {
    setActiveSection(sectionId)
    scrollToSection(sectionId)
  }

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Adjust detection offset based on screen size
      const isMobile = window.innerWidth < 640 // sm breakpoint
      const offset = isMobile ? 120 : 100 // Increased offset for mobile to account for larger header
      const scrollPosition = window.scrollY + offset

      for (const section of sections) {
        // For ai-interview, check the questions section instead
        const targetId = section.id === "ai-interview" ? "questions" : section.id

        // Get all elements with this ID and find the visible one
        const elements = document.querySelectorAll(`#${targetId}`)
        let visibleElement = null

        for (const element of elements) {
          const rect = element.getBoundingClientRect()
          const computedStyle = window.getComputedStyle(element)

          // Check if element is visible
          if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
            visibleElement = element
            break
          }
        }

        if (visibleElement) {
          const rect = visibleElement.getBoundingClientRect()
          const elementTop = rect.top + window.pageYOffset
          const elementBottom = elementTop + rect.height

          if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
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
    <div className={`sm:w-[95px] w-full sm:sticky sm:top-[60px] sm:z-auto h-9 sm:h-fit py-2 sm:py-4 px-4 sm:px-0 border-b sm:border-b-0 sm:bg-white/40 sm:backdrop-blur-sm ${className}`}>
      <nav className="sm:space-y-2 flex sm:flex-col space-x-4 sm:space-x-0 h-full items-center sm:items-start">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={`cursor-pointer sm:block sm:w-full sm:text-left text-center text-sm transition-colors duration-200 ${
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