import { ReactNode } from "react";

import SiteFooter from "@/components/site-footer";

type Props = {
    sidebar?: ReactNode;
    aside?: ReactNode;
    children: ReactNode;
    mainClassName?: string;
};

export default function BlogShell({ sidebar, aside, children, mainClassName = "" }: Props) {
    return (
        <div className="desktop-blog-shell mx-auto w-full max-w-[92rem] px-4 pb-12 pt-8 md:pb-24 md:pt-10 xl:max-w-none xl:px-0 xl:pt-0 xl:pb-0">
            <aside className="desktop-column-scroll hidden xl:block xl:min-h-0">{sidebar}</aside>
            <div className="desktop-blog-stage xl:min-h-0">
                <main className={["desktop-main-scroll desktop-blog-main xl:min-h-0 xl:h-full", mainClassName].filter(Boolean).join(" ")}>
                    <div className="desktop-blog-main-inner">
                        {children}
                        <SiteFooter centered className="hidden xl:block" />
                    </div>
                </main>
                <aside className="desktop-rail-scroll hidden xl:block desktop-blog-aside">
                    {aside}
                </aside>
            </div>
        </div>
    );
}