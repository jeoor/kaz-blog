import { ReactNode } from "react";

type Props = {
    sidebar?: ReactNode;
    aside?: ReactNode;
    children: ReactNode;
    mainClassName?: string;
};

export default function BlogShell({ sidebar, aside, children, mainClassName = "" }: Props) {
    return (
        <div className="mx-auto w-full max-w-[92rem] px-4 pb-24 pt-8 md:pt-10 xl:grid xl:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:gap-10">
            <aside className="hidden xl:block">{sidebar}</aside>
            <main className={mainClassName}>{children}</main>
            <aside className="hidden xl:block">{aside}</aside>
        </div>
    );
}