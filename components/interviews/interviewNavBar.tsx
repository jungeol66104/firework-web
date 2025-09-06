"use client"

import { NavBar } from "@/components/navBar"
import TableOfContents from "@/components/interviews/tableOfContents"

export default function InterviewNavBar() {
  return (
    <NavBar>
      <div className="sm:hidden">
        <TableOfContents />
      </div>
    </NavBar>
  )
}