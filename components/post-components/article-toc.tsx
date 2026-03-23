"use client";

import type { TocItem } from "@/lib/content-html";
import { useEffect, useState } from "react";
import WidgetCard from "@/components/layout/right-rail/widget-card";

type Props = {
    items: TocItem[];
    className?: string;
    mode?: "default" | "mobile-sheet";
    variant?: "default" | "widget";
};

export default function ArticleToc({ items, className, mode = "default", variant = "default" }: Props) {
    const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (items.length === 0) return;

        const headingElements = items
            .map((item) => document.getElementById(item.id))
            .filter((element): element is HTMLElement => Boolean(element))
            .sort((left, right) => left.offsetTop - right.offsetTop);

        if (headingElements.length === 0) return;

        const TOP_OFFSET_PX = 180;

        const findScrollParent = (element: HTMLElement): HTMLElement | null => {
            let current: HTMLElement | null = element;
            while (current && current !== document.body) {
                const style = window.getComputedStyle(current);
                const overflowY = style.overflowY;
                const canScroll = (overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight;
                if (canScroll) return current;
                current = current.parentElement;
            }
            return null;
        };

        const scrollParent = findScrollParent(headingElements[0]);
        const scrollingElement = document.scrollingElement as HTMLElement | null;
        const scrollContainer = scrollParent ?? scrollingElement ?? document.documentElement;
        const listenOnWindow = scrollContainer === document.documentElement || scrollContainer === document.body;

        let rafId = 0;

        const updateActiveId = () => {
            rafId = 0;

            const scrollTop = listenOnWindow ? window.scrollY : scrollContainer.scrollTop;
            const clientHeight = listenOnWindow ? window.innerHeight : scrollContainer.clientHeight;
            const scrollHeight = listenOnWindow ? document.documentElement.scrollHeight : scrollContainer.scrollHeight;

            const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 2;
            if (scrolledToBottom) {
                setActiveId(headingElements[headingElements.length - 1]?.id ?? items[0].id);
                return;
            }

            const containerTop = listenOnWindow ? 0 : scrollContainer.getBoundingClientRect().top;

            let nextActive = headingElements[0];
            for (const heading of headingElements) {
                const topRelativeToContainer = heading.getBoundingClientRect().top - containerTop;
                if (topRelativeToContainer - TOP_OFFSET_PX <= 0) {
                    nextActive = heading;
                }
            }

            setActiveId(nextActive?.id ?? items[0].id);
        };

        const requestUpdate = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(updateActiveId);
        };

        const onHashChange = () => {
            const hash = window.location.hash.slice(1);
            if (hash && items.some((item) => item.id === hash)) {
                setActiveId(hash);
            }
            requestUpdate();
        };

        if (listenOnWindow) {
            window.addEventListener("scroll", requestUpdate, { passive: true });
        } else {
            scrollContainer.addEventListener("scroll", requestUpdate, { passive: true });
        }
        window.addEventListener("resize", requestUpdate);
        window.addEventListener("hashchange", onHashChange);
        requestUpdate();

        return () => {
            if (rafId) {
                window.cancelAnimationFrame(rafId);
            }
            if (listenOnWindow) {
                window.removeEventListener("scroll", requestUpdate);
            } else {
                scrollContainer.removeEventListener("scroll", requestUpdate);
            }
            window.removeEventListener("resize", requestUpdate);
            window.removeEventListener("hashchange", onHashChange);
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
                        "fixed bottom-36 right-5 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[var(--page-bg)] text-current shadow-sm dark:border-white/10 dark:bg-[var(--page-bg)]",
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
                        <div className="absolute inset-x-4 bottom-5 rounded-[1.6rem] border border-black/10 bg-[var(--page-bg)] p-5 text-current shadow-2xl dark:border-white/10 dark:bg-[var(--page-bg)]" onClick={(event) => event.stopPropagation()}>
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/40 dark:text-white/40">目录</div>
                                    <div className="mt-2 text-sm text-black/62 dark:text-white/62">当前阅读：{activeItem.text}</div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="关闭目录"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-black/[0.02] text-current dark:border-white/10 dark:bg-white/[0.04]"
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

    if (variant === "widget") {
        return (
            <WidgetCard title="目录" className={["sticky top-24", className].filter(Boolean).join(" ")}>
                <nav aria-label="目录" className="mt-4">
                    {tocList}
                </nav>
            </WidgetCard>
        );
    }

    return (
        <nav className={["article-toc", className].filter(Boolean).join(" ")}>
            <div className="article-toc-label">目录</div>
            {tocList}
        </nav>
    );
}