import type { ReactNode } from "react";

type Props = {
    title: ReactNode;
    titleRight?: ReactNode;
    children: ReactNode;
    className?: string;
};

export default function WidgetCard({ title, titleRight, children, className = "" }: Props) {
    return (
        <section
            className={[
                "rounded-[1.35rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02]",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/40">
                    {title}
                </div>
                {titleRight ? <div className="shrink-0">{titleRight}</div> : null}
            </div>
            {children}
        </section>
    );
}
