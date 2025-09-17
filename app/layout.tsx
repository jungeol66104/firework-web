"use client"

import "./globals.css";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { NavBar } from "@/components/navBar";
import { Footer } from "@/components/ui/footer";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const isAuthPage = pathname.startsWith("/auth");
  const isPaymentPage = pathname.startsWith("/payments");
  const isDashboardPage = pathname === "/dashboard";
  const isInterviewPage = pathname.startsWith("/interviews");
  const isPolicyPage = pathname.startsWith("/terms-of-service") || pathname.startsWith("/privacy-policy");

  return (
    <>
      <html className="overflow-y-scroll" lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider attribute="class" defaultTheme="white" enableSystem disableTransitionOnChange>
            <div className="flex flex-col min-h-screen">
              {!isAdminPage && !isAuthPage && !isPaymentPage && !isDashboardPage && !isInterviewPage && !isPolicyPage && <NavBar />}
              
              <main className="flex-1">
                {children}
              </main>
              
              {!isAdminPage && <Footer />}
            </div>
            <Toaster position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
