import Link from "next/link";

import { SITE } from "@/app/site-config";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type SidebarKey = "home" | "archive" | "links" | "about" | "write";

type Props = {
  active: SidebarKey;
};

const NAV_ITEMS: Array<{ key: SidebarKey; href: string; label: string }> = [
  { key: "home", href: "/", label: "文章" },
  { key: "archive", href: "/archive", label: "归档" },
  { key: "links", href: "/links", label: "友链" },
  { key: "about", href: "/about", label: "关于" },
  { key: "write", href: "/write", label: "写作台" },
];

export default function BlogSidebar({ active }: Props) {
  return (
    <div className="sticky top-8 flex flex-col gap-5 pr-2">
      <div className="rounded-[1.4rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <Link href="/" className="block text-current no-underline">
          <div className="text-[10px] font-semibold uppercase tracking-[0.38em] text-black/48 dark:text-white/48">
            {SITE.shortTitle}
          </div>
          <div className="mt-3 font-serif text-[2rem] font-semibold tracking-tight">
            {SITE.title}
          </div>
        </Link>
        <p className="mt-3 text-sm leading-7 text-black/62 dark:text-white/60">
          {SITE.tagline}
        </p>
      </div>

      <nav aria-label="桌面导航" className="rounded-[1.4rem] border border-black/8 bg-black/[0.02] p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-black/40 dark:text-white/40">
          Navigation
        </div>
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm transition",
                    isActive
                      ? "bg-black/[0.06] text-black dark:bg-white/[0.05] dark:text-white"
                      : "text-black/60 hover:bg-black/[0.03] hover:text-black dark:text-white/60 dark:hover:bg-white/[0.03] dark:hover:text-white",
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

      <div className="flex items-center justify-between rounded-full border border-black/8 bg-black/[0.02] px-4 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/40">
          Theme
        </div>
        <ThemeSwitcher />
      </div>
    </div>
  );
}