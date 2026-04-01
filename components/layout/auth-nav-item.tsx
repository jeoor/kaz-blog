"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthNavItem() {
    const { isLoggedIn, loading, logout } = useAuth();
    const pathname = usePathname();

    if (loading) return null;

    if (isLoggedIn) {
        return (
            <li>
                <button
                    type="button"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm transition text-black/60 hover:bg-black/[0.03] dark:text-white/60 dark:hover:bg-white/[0.03]"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-black/25 dark:bg-white/25" />
                    <span>退出登录</span>
                </button>
            </li>
        );
    }

    return (
        <li>
            <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm transition text-black/60 hover:bg-black/[0.03] dark:text-white/60 dark:hover:bg-white/[0.03]"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-black/25 dark:bg-white/25" />
                <span>登录</span>
            </Link>
        </li>
    );
}
