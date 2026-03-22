"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { SITE } from "@/app/site-config";

const NavbarComponent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b border-black/10 bg-[var(--page-bg)] backdrop-blur-xl dark:border-white/10 xl:hidden">
      <div className="mx-auto flex max-w-[80rem] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            aria-label={isMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <span className="sr-only">菜单</span>
            {isMenuOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10" />
                <path d="M15 5L5 15" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M3.5 5.5h13" />
                <path d="M3.5 10h13" />
                <path d="M3.5 14.5h13" />
              </svg>
            )}
          </button>
        </div>

        <Link href="/" className="flex items-center gap-2.5 text-current no-underline">
          <span className="px-0 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-black/75 dark:text-white/75">
            {SITE.title}
          </span>
          <span className="hidden leading-none text-sm text-black/60 lg:block dark:text-white/60">{SITE.tagline}</span>
        </Link>

        <nav aria-label="主导航" className="hidden md:block">
          <ul className="flex items-center gap-4">
            {SITE.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="px-2 py-2 text-sm font-medium text-black/64 transition-all hover:text-black dark:text-white/64 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <ThemeSwitcher />
            </li>
          </ul>
        </nav>

        <div className="md:hidden">
          <ThemeSwitcher />
        </div>
      </div>

      {isMenuOpen ? (
        <nav aria-label="移动端导航" className="border-t border-black/10 bg-[var(--page-bg)] px-4 py-5 dark:border-white/10 md:hidden">
          <div className="mx-auto max-w-[80rem]">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
              Navigation
            </div>
            <ul className="space-y-3">
              {SITE.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-[1.25rem] border border-black/10 bg-white/65 px-4 py-3 text-base font-medium text-current dark:border-white/10 dark:bg-white/[0.04]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      ) : null}
    </header>
  );
};

export default NavbarComponent;
