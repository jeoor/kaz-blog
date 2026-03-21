// Import necessary modules and components
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Define and export the 'Providers' component, which wraps other components with context providers
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
