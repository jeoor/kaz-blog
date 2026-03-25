"use client";

import { startTransition, Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Pagination from "@/components/pagination";
import PostSearchInput from "@/components/post-search-input";
import RenderPosts from "@/components/post-components/render-posts";
import { searchPosts } from "@/lib/post-search";

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
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const query = searchParams.get("q") || "";
    const deferredQuery = useDeferredValue(query);
    const filteredPosts = useMemo(() => searchPosts(posts, deferredQuery), [deferredQuery, posts]);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredPosts.length / Math.max(1, pageSize))), [filteredPosts.length, pageSize]);
    const [currentPage, setCurrentPage] = useState(1);

    const visiblePosts = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredPosts.slice(startIndex, startIndex + pageSize);
    }, [currentPage, filteredPosts, pageSize]);

    function handleQueryChange(nextQuery: string) {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            const trimmedQuery = nextQuery.trim();

            if (trimmedQuery) {
                params.set("q", trimmedQuery);
            } else {
                params.delete("q");
            }

            params.delete("page");

            const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
            router.replace(nextUrl, { scroll: false });
        });
    }

    function getSearchPageHref(page: number) {
        const params = new URLSearchParams();
        const trimmedQuery = query.trim();

        if (trimmedQuery) {
            params.set("q", trimmedQuery);
        }

        if (page > 1) {
            params.set("page", String(page));
        }

        const paramsText = params.toString();
        return paramsText ? `${getPageHref(1)}?${paramsText}` : getPageHref(1);
    }

    return (
        <section>
            <Suspense fallback={null}>
                <SearchParamsSync totalPages={totalPages} onPageChange={setCurrentPage} />
            </Suspense>

            <PostSearchInput
                value={query}
                onChange={handleQueryChange}
                resultCount={filteredPosts.length}
                totalCount={posts.length}
                className="mb-6"
            />

            {filteredPosts.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 px-5 py-8 text-sm text-black/60 dark:border-white/[0.08] dark:text-white">
                    没有找到匹配的文章，试试标题、标签或作者名。
                </div>
            ) : (
                <>
                    <RenderPosts posts={visiblePosts} />

                    <Pagination
                        ariaLabel="首页分页"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        getPageHref={getSearchPageHref}
                    />
                </>
            )}
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
