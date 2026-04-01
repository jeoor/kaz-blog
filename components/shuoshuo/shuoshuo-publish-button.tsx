"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function ShuoshuoPublishButton() {
    const { isLoggedIn, loading } = useAuth();

    if (loading || !isLoggedIn) return null;

    return (
        <Link
            href="/write?type=moment"
            className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-1.5 text-sm text-black/60 transition hover:border-black/18 hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/55 dark:hover:border-white/[0.14]"
        >
            发表说说
        </Link>
    );
}
