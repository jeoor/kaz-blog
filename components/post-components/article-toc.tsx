"use client";

import type { TocItem } from "@/lib/content-html";
import { useEffect, useState } from "react";

type Props = {
    items: TocItem[];
    className?: string;
    mode?: "default" | "mobile-sheet";
};

export default function ArticleToc({ items, className, mode = "default" }: Props) {
    const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (items.length === 0) return;

        const headingElements = items
            .map((item) => document.getElementById(item.id))
            .filter((element): element is HTMLElement => Boolean(element));

        if (headingElements.length === 0) return;

        const visibleHeadings = new Map<string, number>();

        const updateFromHash = () => {
            const hash = window.location.hash.slice(1);
            if (hash && items.some((item) => item.id === hash)) {
                setActiveId(hash);
            }
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const headingId = entry.target.id;
                    if (entry.isIntersecting) {
                        visibleHeadings.set(headingId, entry.boundingClientRect.top);
                    } else {
                        visibleHeadings.delete(headingId);
                    }
                });

                if (visibleHeadings.size > 0) {
                    const nextActiveId = Array.from(visibleHeadings.entries())
                        .sort((left, right) => Math.abs(left[1]) - Math.abs(right[1]))[0]?.[0];

                    if (nextActiveId) {
                        setActiveId(nextActiveId);
                        return;
                    }
                }

                const scrollAnchor = window.scrollY + 180;
                const fallbackHeading = headingElements
                    .filter((heading) => heading.offsetTop <= scrollAnchor)
                    .at(-1);

                setActiveId(fallbackHeading?.id ?? items[0].id);
            },
            {
                rootMargin: "-20% 0px -65% 0px",
                threshold: [0, 0.2, 1],
            }
        );

        headingElements.forEach((element) => observer.observe(element));
        updateFromHash();
        window.addEventListener("hashchange", updateFromHash);

        return () => {
            observer.disconnect();
            window.removeEventListener("hashchange", updateFromHash);
        };
    }, [items]);

    useEffect(() => {
        if (!mobileOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMobileOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileOpen]);

    if (items.length === 0) return null;

    const activeItem = items.find((item) => item.id === activeId) ?? items[0];

    const tocList = (
        <ol className="article-toc-list">
            {items.map((item) => (
                <li
                    key={item.id}
                    className={[
                        item.level === 3 ? "is-sub" : undefined,
                        activeId === item.id ? "is-active" : undefined,
                    ].filter(Boolean).join(" ") || undefined}
                >
                    <a
                        href={`#${item.id}`}
                        aria-current={activeId === item.id ? "location" : undefined}
                        onClick={() => setMobileOpen(false)}
                    >
                        {item.text}
                    </a>
                </li>
            ))}
        </ol>
    );

    if (mode === "mobile-sheet") {
        return (
            <>
                <button
                    type="button"
                    aria-label="打开目录"
                    className={[
                        "fixed bottom-20 right-5 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[rgba(244,239,231,0.94)] text-black shadow-lg dark:border-white/10 dark:bg-[rgba(20,22,26,0.94)] dark:text-white",
                        className,
                    ].filter(Boolean).join(" ")}
                    onClick={() => setMobileOpen(true)}
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 5.5h12" />
                        <path d="M4 10h12" />
                        <path d="M4 14.5h8" />
                    </svg>
                </button>

                {mobileOpen ? (
                    <div className="fixed inset-0 z-[115] bg-black/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
                        <div className="absolute inset-x-4 bottom-5 rounded-[1.6rem] border border-white/10 bg-[rgba(24,26,30,0.96)] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">目录</div>
                                    <div className="mt-2 text-sm text-white/68">当前阅读：{activeItem.text}</div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="关闭目录"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/88"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <path d="M5 5l10 10" />
                                        <path d="M15 5L5 15" />
                                    </svg>
                                </button>
                            </div>

                            <nav className="article-toc article-toc-mobile max-h-[52vh] overflow-y-auto pr-1">
                                {tocList}
                            </nav>
                        </div>
                    </div>
                ) : null}
            </>
        );
    }

    return (
        <nav className={["article-toc", className].filter(Boolean).join(" ")}>
            <div className="article-toc-label">目录</div>
            {tocList}
        </nav>
    );
}