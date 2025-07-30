"use client"

import "./globals.css";
import { usePathname } from "next/navigation";
import { NavBar } from "@/components/navBar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  const pathname = usePathname();
  const isSigninPage = pathname === "/signin";

  return (
    <>
      <html className="overflow-y-scroll" lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider attribute="class" defaultTheme="white" enableSystem disableTransitionOnChange>
            {!isSigninPage && <NavBar />}
            {children}
            <Toaster position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
