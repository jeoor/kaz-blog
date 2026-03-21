"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MoonIcon } from "@/components/icons/moon";
import { SunIcon } from "@/components/icons/sun";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="切换主题"
        className="pointer-events-none rounded-full border border-black/10 opacity-0 dark:border-white/10"
      >
        <SunIcon />
      </button>
    );
  }

  const current = resolvedTheme ?? theme;
  const isDark = current === "dark";

  return (
    <button
      type="button"
      aria-label="切换主题"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-transparent text-current dark:border-white/15"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
