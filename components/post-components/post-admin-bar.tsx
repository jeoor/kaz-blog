"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";

type Props = { slug: string };

export default function PostAdminBar({ slug }: Props) {
    const { isLoggedIn, loading } = useAuth();
    const router = useRouter();

    if (loading || !isLoggedIn) return null;

    async function handleDelete() {
        if (!confirm(`确认删除文章「${slug}」？此操作不可撤销。`)) return;
        try {
            const res = await fetch(adminApiUrl(`/api/admin/posts?slug=${encodeURIComponent(slug)}`), {
                method: "DELETE",
                credentials: adminCredentials(),
            });
            if (res.ok) {
                router.push("/");
                router.refresh();
            } else {
                const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
                alert(String(data?.message || "删除失败"));
            }
        } catch {
            alert("删除请求失败");
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Link
                href={`/write?slug=${encodeURIComponent(slug)}`}
                className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-black/55 transition hover:border-black/18 hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/55 dark:hover:border-white/[0.14]"
            >
                修改
            </Link>
            <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded-full border border-red-400/25 bg-red-50/50 px-3 py-1 text-xs text-red-600/75 transition hover:border-red-400/40 dark:border-red-400/20 dark:bg-red-900/10 dark:text-red-400/70"
            >
                删除
            </button>
        </div>
    );
}
