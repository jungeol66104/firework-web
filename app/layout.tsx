import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="white"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
