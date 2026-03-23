"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Pagination from "@/components/pagination";
import RenderPosts from "@/components/post-components/render-posts";

function toPositiveInteger(value: string | null) {
    const parsed = Number.parseInt(value || "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getPageHref(page: number) {
    return page <= 1 ? "/" : `/?page=${page}`;
}

type Props = {
    posts: BlogPost[];
    pageSize: number;
};

export default function HomePosts({ posts, pageSize }: Props) {
    const totalPages = useMemo(() => Math.max(1, Math.ceil(posts.length / Math.max(1, pageSize))), [pageSize, posts.length]);
    const [currentPage, setCurrentPage] = useState(1);

    const visiblePosts = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return posts.slice(startIndex, startIndex + pageSize);
    }, [currentPage, pageSize, posts]);

    return (
        <section>
            <Suspense fallback={null}>
                <SearchParamsSync totalPages={totalPages} onPageChange={setCurrentPage} />
            </Suspense>

            <RenderPosts posts={visiblePosts} />

            <Pagination
                ariaLabel="首页分页"
                currentPage={currentPage}
                totalPages={totalPages}
                getPageHref={getPageHref}
            />
        </section>
    );
}

function SearchParamsSync({ totalPages, onPageChange }: { totalPages: number; onPageChange: (page: number) => void }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        const nextPage = Math.min(toPositiveInteger(searchParams.get("page")), totalPages);
        onPageChange(nextPage);
    }, [onPageChange, searchParams, totalPages]);

    return null;
}
