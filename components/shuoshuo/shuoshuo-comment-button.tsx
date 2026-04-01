"use client";

import type { CSSProperties } from "react";

const SHUOSHUO_COMMENT_DRAFT_KEY = "shuoshuo-comment-draft";
const SHUOSHUO_QUOTE_EVENT = "shuoshuo:quote";

type Props = {
    quote: string;
    className?: string;
    style?: CSSProperties;
};

export { SHUOSHUO_COMMENT_DRAFT_KEY, SHUOSHUO_QUOTE_EVENT };

export default function ShuoshuoCommentButton({ quote, className = "", style }: Props) {
    return (
        <button
            type="button"
            className={className}
            style={style}
            onClick={() => {
                if (typeof window === "undefined") {
                    return;
                }

                window.localStorage.setItem(SHUOSHUO_COMMENT_DRAFT_KEY, quote);
                window.dispatchEvent(new CustomEvent(SHUOSHUO_QUOTE_EVENT, { detail: { quote } }));

                window.requestAnimationFrame(() => {
                    const target = document.getElementById("comments") || document.getElementById("comments-anchor");
                    target?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            }}
        >
            去评论
        </button>
    );
}
