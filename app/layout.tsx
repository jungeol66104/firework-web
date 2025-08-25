"use client"

import "./globals.css";
import { usePathname } from "next/navigation";
import { AdminNavBar } from "@/components/admin/adminNavBar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { NavBar } from "@/components/navBar";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const isAuthPage = pathname.startsWith("/auth");
  const isPaymentPage = pathname.startsWith("/payments");

  return (
    <>
      <html className="overflow-y-scroll" lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider attribute="class" defaultTheme="white" enableSystem disableTransitionOnChange>
            {isAdminPage && <AdminNavBar />}
            {!isAdminPage && !isAuthPage && !isPaymentPage && <NavBar />}
            {children}
            <Toaster position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
