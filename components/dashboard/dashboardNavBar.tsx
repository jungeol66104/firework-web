"use client"

import { NavBar } from "@/components/navBar"
import DashboardTableOfContents from "@/components/dashboard/dashboardTableOfContents"

export default function DashboardNavBar() {
  return (
    <NavBar>
      <div className="sm:hidden">
        <DashboardTableOfContents />
      </div>
    </NavBar>
  )
}