"use client";

import { useEffect, useState } from "react";

type Props = {
    targetId?: string;
    className?: string;
};

function resolveScroller(): HTMLElement | Window {
    const el = document.querySelector<HTMLElement>(".desktop-main-scroll");
    if (!el) return window;
    if (el.scrollHeight <= el.clientHeight) return window;
    return el;
}

function scrollToTarget(target: HTMLElement, scroller: HTMLElement | Window, offsetPx: number) {
    if (scroller === window) {
        const top = target.getBoundingClientRect().top + window.scrollY - offsetPx;
        window.scrollTo({ top, behavior: "smooth" });
        return;
    }

    const container = scroller as HTMLElement;
    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const top = targetTop - containerTop + container.scrollTop - offsetPx;
    container.scrollTo({ top, behavior: "smooth" });
}

export default function ScrollToComments({ targetId = "comments", className = "" }: Props) {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const update = () => {
            setEnabled(Boolean(document.getElementById(targetId)));
        };

        update();
        const observer = new MutationObserver(() => update());
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [targetId]);

    if (!enabled) return null;

    return (
        <div
            className={[
                "fixed bottom-20 right-5 z-[105]",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                type="button"
                aria-label="跳到评论"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[var(--page-bg)] text-current shadow-sm dark:border-white/10 dark:bg-[var(--page-bg)]"
                onClick={() => {
                    const target = document.getElementById(targetId);
                    if (!target) return;
                    scrollToTarget(target, resolveScroller(), 120);
                }}
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.2 15.6l-2.4 2.4V6.5A2.5 2.5 0 0 1 6.3 4h7.4A2.5 2.5 0 0 1 16.2 6.5v4.6a2.5 2.5 0 0 1-2.5 2.5H7.8L6.2 15.6z" />
                    <path d="M7.2 7.6h5.6" />
                    <path d="M7.2 10.4h4.1" />
                </svg>
            </button>
        </div>
    );
}
