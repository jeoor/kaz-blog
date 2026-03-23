"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MoonIcon } from "@/components/icons/moon";
import { SunIcon } from "@/components/icons/sun";

type Props = {
  className?: string;
};

export function ThemeSwitcher({ className = "" }: Props) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, theme, setTheme } = useTheme();

  const toggleTheme = (isDark: boolean) => {
    const root = document.documentElement;
    root.classList.add("theme-switching");

    // Force a reflow so the class takes effect before theme mutations.
    void root.offsetHeight;

    setTheme(isDark ? "light" : "dark");

    window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, 200);
  };

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="切换主题"
        className={[
          "pointer-events-none mt-auto inline-flex w-fit items-center justify-center rounded-full border border-black/10 bg-black/[0.02] p-0.5 opacity-0 dark:border-white/10 dark:bg-white/[0.02]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="sr-only">切换主题</span>
        <span aria-hidden="true" className="block h-8 w-14" />
      </button>
    );
  }

  const current = resolvedTheme ?? theme;
  const isDark = current === "dark";

  return (
    <button
      type="button"
      aria-label="切换主题"
      className={[
        "mt-auto inline-flex w-fit items-center justify-center rounded-full border border-black/10 bg-black/[0.02] p-0.5 text-current transition-colors dark:border-white/10 dark:bg-white/[0.02]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => toggleTheme(isDark)}
    >
      <span
        aria-hidden="true"
        className="relative block h-8 w-14 shrink-0"
      >
        <span
          className={[
            "absolute left-0.5 top-0.5 grid h-7 w-7 place-items-center rounded-full border border-black/10 bg-white/70 text-black/72 transition-transform duration-300 ease-out dark:border-white/[0.08] dark:bg-black/30 dark:text-white/72",
            isDark ? "translate-x-0" : "translate-x-7",
          ].join(" ")}
        >
          {isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
        </span>
      </span>
    </button>
  );
}
