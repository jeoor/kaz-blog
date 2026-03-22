import Link from "next/link";

type Item =
    | { type: "page"; page: number }
    | { type: "ellipsis"; key: string };

function getItems(currentPage: number, totalPages: number, siblingCount = 1): Item[] {
    if (totalPages <= 1) return [];

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);

    const start = Math.max(2, currentPage - siblingCount);
    const end = Math.min(totalPages - 1, currentPage + siblingCount);

    for (let page = start; page <= end; page += 1) {
        pages.add(page);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);

    const items: Item[] = [];
    for (let index = 0; index < sorted.length; index += 1) {
        const page = sorted[index];
        const prev = sorted[index - 1];

        if (index > 0 && page - prev > 1) {
            items.push({ type: "ellipsis", key: `ellipsis-${prev}-${page}` });
        }

        items.push({ type: "page", page });
    }

    return items;
}

type Props = {
    currentPage: number;
    totalPages: number;
    getPageHref: (page: number) => string;
    ariaLabel?: string;
    className?: string;
};

export default function Pagination({ currentPage, totalPages, getPageHref, ariaLabel = "分页", className = "" }: Props) {
    if (totalPages <= 1) return null;

    const prevPage = Math.max(1, currentPage - 1);
    const nextPage = Math.min(totalPages, currentPage + 1);

    const buttonBase = "rounded-full border px-4 py-2 transition";
    const buttonDisabled = "pointer-events-none border-black/6 text-black/28 dark:border-white/[0.05] dark:text-white/28";
    const buttonEnabled = "border-black/10 text-black/62 hover:border-black/16 hover:text-black dark:border-white/[0.08] dark:text-white/62 dark:hover:border-white/[0.12] dark:hover:text-white";

    const pageBase = "inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 transition";
    const pageActive = "border-black/14 bg-black/[0.04] text-black dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white";
    const pageIdle = "border-black/8 text-black/54 hover:border-black/14 hover:text-black dark:border-white/[0.05] dark:text-white/54 dark:hover:border-white/[0.1] dark:hover:text-white";

    const items = getItems(currentPage, totalPages);

    return (
        <nav
            aria-label={ariaLabel}
            className={[
                "mt-8 flex flex-wrap items-center justify-center gap-2 text-sm",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <Link
                href={getPageHref(prevPage)}
                aria-disabled={currentPage === 1}
                className={[buttonBase, currentPage === 1 ? buttonDisabled : buttonEnabled].join(" ")}
            >
                上一页
            </Link>

            <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.02] px-4 text-black/54 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/54 sm:hidden">
                    {currentPage} / {totalPages}
                </span>

                <div className="hidden items-center gap-2 sm:flex">
                    {items.map((item) => {
                        if (item.type === "ellipsis") {
                            return (
                                <span
                                    key={item.key}
                                    aria-hidden="true"
                                    className="inline-flex h-10 min-w-10 items-center justify-center text-black/30 dark:text-white/30"
                                >
                                    …
                                </span>
                            );
                        }

                        return (
                            <Link
                                key={item.page}
                                href={getPageHref(item.page)}
                                aria-current={item.page === currentPage ? "page" : undefined}
                                className={[pageBase, item.page === currentPage ? pageActive : pageIdle].join(" ")}
                            >
                                {item.page}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <Link
                href={getPageHref(nextPage)}
                aria-disabled={currentPage === totalPages}
                className={[buttonBase, currentPage === totalPages ? buttonDisabled : buttonEnabled].join(" ")}
            >
                下一页
            </Link>
        </nav>
    );
}
