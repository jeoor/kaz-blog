import Link from "next/link";

import { SITE } from "@/app/site-config";

export default function SiteFooter() {
    const year = new Date().getFullYear();
    const { footer } = SITE;
    const filings = footer.filings.filter((item) => item.enabled && item.label);

    return (
        <footer className="mx-auto mt-10 w-full max-w-[92rem] px-4 pb-10">
            <div className="editorial-page">
                <div className="editorial-inner border-t editorial-rule py-5 md:py-6">
                    <div className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.18em] text-black/42 md:flex-row md:flex-wrap md:items-center md:justify-between dark:text-white/42">
                        <div>© {year} {footer.copyrightName}</div>
                        <div>
                            Powered by{" "}
                            <a href={footer.poweredBy.href} target="_blank" rel="noreferrer" className="text-black/62 hover:text-current dark:text-white/62">
                                {footer.poweredBy.label}
                            </a>
                        </div>
                        {filings.map((item) =>
                            item.href ? (
                                <Link key={item.label} href={item.href} className="text-black/62 hover:text-current dark:text-white/62">
                                    {item.label}
                                </Link>
                            ) : (
                                <div key={item.label}>{item.label}</div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}