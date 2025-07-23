"use client"

import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";
import { NavBar } from "@/components/navBar";
import { usePathname } from "next/navigation";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {

  const pathname = usePathname();
  const isSigninPage = pathname === "/signin";

  return (
    <>
      <html className="overflow-y-scroll" lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="white"
            enableSystem
            disableTransitionOnChange
          >
            {!isSigninPage && <NavBar />}
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
