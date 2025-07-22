"use client"

import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";
import { NavBar } from "@/components/navBar";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
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
            <NavBar />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
