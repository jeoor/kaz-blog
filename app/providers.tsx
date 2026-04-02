// 导入所需模块与组件
"use client";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { AuthProvider } from "@/lib/auth-context";

// 定义并导出 Providers 组件，为子组件统一包裹上下文提供者
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <NextTopLoader
        color="var(--accent)"
        initialPosition={0.08}
        crawlSpeed={180}
        height={2}
        showSpinner={false}
        easing="ease"
        speed={220}
        shadow={false}
      />
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          {children}
        </AuthProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
