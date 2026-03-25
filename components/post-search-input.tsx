"use client";

import { useRef, useState } from "react";

type Props = {
    value: string;
    onChange: (value: string) => void;
    resultCount: number;
    totalCount: number;
    placeholder?: string;
    className?: string;
};

export default function PostSearchInput({
    value,
    onChange,
    resultCount,
    totalCount,
    placeholder = "搜索标题、摘要、作者、标签",
    className = "",
}: Props) {
    const [draftValue, setDraftValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);
    const hasQuery = draftValue.trim().length > 0;

    function commitValue(nextValue: string) {
        setDraftValue(nextValue);
        if (inputRef.current && inputRef.current.value !== nextValue) {
            inputRef.current.value = nextValue;
        }
        onChange(nextValue);
    }

    return (
        <div className={[
            "rounded-[1.4rem] border border-black/8 bg-black/[0.02] px-5 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]",
            className,
        ].filter(Boolean).join(" ")}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                    <p className="eyebrow-label">Search</p>
                    <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">按关键词筛选文章</h2>
                    <p className="mt-2 text-sm leading-7 text-black/62 dark:text-white">
                        支持标题、摘要、作者、标签和 slug。
                    </p>
                </div>

                <div className="text-sm text-black/55 dark:text-white">
                    {hasQuery ? `找到 ${resultCount} / ${totalCount} 篇` : `共 ${totalCount} 篇文章`}
                </div>
            </div>

            <div className="mt-5">
                <input
                    ref={inputRef}
                    type="search"
                    defaultValue={value}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setDraftValue(nextValue);

                        if (!isComposingRef.current) {
                            onChange(nextValue);
                        }
                    }}
                    onCompositionStart={() => {
                        isComposingRef.current = true;
                    }}
                    onCompositionEnd={(event) => {
                        isComposingRef.current = false;
                        commitValue(event.currentTarget.value);
                    }}
                    placeholder={placeholder}
                    aria-label="搜索文章"
                    className="w-full rounded-full border border-black/10 bg-white/88 px-5 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/42"
                />
            </div>
        </div>
    );
}
