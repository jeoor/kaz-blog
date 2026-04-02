"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { SITE } from "@/site-config";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useAuth } from "@/lib/auth-context";

type SidebarKey = string;

type Props = {
    active?: SidebarKey;
};

const HOME_NAV_ITEM = { key: "home", href: "/", label: "文章" };

function toSidebarKey(href: string): string {
    const path = String(href || "").trim();
    if (!path || path === "/") return "home";
    return path.replace(/^\/+/, "").replace(/\/+$/, "") || "home";
}

export default function BlogSidebar({ active }: Props) {
    const { isLoggedIn, loading, logout } = useAuth();
    const pathname = usePathname();
    const avatarSrc = SITE.avatar?.src?.trim();
    const avatarAlt = (SITE.avatar?.alt || SITE.author || SITE.title).trim();
    const configNav = Array.isArray(SITE.nav) ? SITE.nav : [];
    const navItems = [
        HOME_NAV_ITEM,
        ...configNav.map((item) => ({
            key: toSidebarKey(item.href),
            href: item.href,
            label: item.label,
        })),
    ].filter((item) => item.key !== "write" || isLoggedIn);

    return (
        <div className="flex min-h-full flex-col gap-5 pr-2">
            <div className="rounded-[1.4rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <Link href="/" className="block text-current no-underline">
                    <div className="flex items-center gap-3">
                        {avatarSrc ? (
                            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-black/8 bg-white/70 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                <Image src={avatarSrc} alt={avatarAlt} fill sizes="44px" className="object-cover" priority />
                            </div>
                        ) : null}
                        <div className="font-serif text-[1.75rem] font-semibold tracking-tight">
                            {SITE.title}
                        </div>
                    </div>
                </Link>
                <p className="mt-3 text-sm leading-7 text-black/62 dark:text-white/60">
                    {SITE.tagline}
                </p>
            </div>

            <nav aria-label="桌面端导航" className="rounded-[1.4rem] border border-black/8 bg-black/[0.02] p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-black/40 dark:text-white/40">
                    Navigation
                </div>
                <ul className="space-y-1.5">
                    {navItems.map((item) => {
                        const isActive = active ? item.key === active : false;
                        return (
                            <li key={item.key}>
                                <Link
                                    href={item.href}
                                    className={[
                                        "flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm transition",
                                        isActive
                                            ? "bg-black/[0.06] text-black dark:bg-white/[0.05] dark:text-white"
                                            : "text-black/60 hover:bg-black/[0.03] dark:text-white/60 dark:hover:bg-white/[0.03]",
                                    ].join(" ")}
                                >
                                    <span className={[
                                        "h-1.5 w-1.5 rounded-full",
                                        isActive ? "bg-black dark:bg-white" : "bg-black/25 dark:bg-white/25",
                                    ].join(" ")} />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="mt-auto flex items-center justify-between gap-3">
                <ThemeSwitcher className="!mt-0" />

                {!loading ? (
                    isLoggedIn ? (
                        <button
                            type="button"
                            onClick={() => void logout()}
                            className="rounded-[1.1rem] border border-black/8 bg-black/[0.02] px-3.5 py-2 text-sm text-black/62 transition hover:bg-black/[0.04] dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/60 dark:hover:bg-white/[0.04]"
                        >
                            退出
                        </button>
                    ) : (
                        <Link
                            href={`/login?next=${encodeURIComponent(pathname)}`}
                            className="rounded-[1.1rem] border border-black/8 bg-black/[0.02] px-3.5 py-2 text-sm text-black/62 transition hover:bg-black/[0.04] dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/60 dark:hover:bg-white/[0.04]"
                        >
                            登录
                        </Link>
                    )
                ) : null}
            </div>
        </div>
    );
}