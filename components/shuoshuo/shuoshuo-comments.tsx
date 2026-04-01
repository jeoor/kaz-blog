"use client";

import { useEffect, useRef, useState } from "react";

import TwikooComments from "@/components/comments/twikoo-comments";
import { SHUOSHUO_COMMENT_DRAFT_KEY, SHUOSHUO_QUOTE_EVENT } from "@/components/shuoshuo/shuoshuo-comment-button";

type Props = {
    className?: string;
};

export default function ShuoshuoComments({ className = "" }: Props) {
    const anchorRef = useRef<HTMLDivElement | null>(null);
    const canObserve = typeof window !== "undefined" && typeof window.IntersectionObserver === "function";
    const [shouldRenderComment, setShouldRenderComment] = useState(!canObserve);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const onQuote = () => setShouldRenderComment(true);
        window.addEventListener(SHUOSHUO_QUOTE_EVENT, onQuote);
        return () => window.removeEventListener(SHUOSHUO_QUOTE_EVENT, onQuote);
    }, []);

    useEffect(() => {
        if (shouldRenderComment || !canObserve) return;

        const anchor = anchorRef.current;
        if (!anchor) {
            return;
        }

        const observer = new window.IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                setShouldRenderComment(true);
                observer.disconnect();
            },
            { rootMargin: "320px 0px" }
        );

        observer.observe(anchor);
        return () => observer.disconnect();
    }, [canObserve, shouldRenderComment]);

    return (
        <div id="comments-anchor" ref={anchorRef} className={["mt-10", className].filter(Boolean).join(" ")}>
            {!shouldRenderComment ? (
                <button
                    type="button"
                    className="rounded-[0.95rem] border border-black/10 bg-black/[0.02] px-4 py-2 text-sm text-black/72 transition hover:border-black/16 hover:bg-black/[0.04] dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white/72 dark:hover:border-white/[0.16] dark:hover:bg-white/[0.05]"
                    onClick={() => setShouldRenderComment(true)}
                >
                    展开评论区
                </button>
            ) : (
                <TwikooComments title="说说评论" className="mt-0" draftStorageKey={SHUOSHUO_COMMENT_DRAFT_KEY} />
            )}
        </div>
    );
}
