import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavbarComponent from "@/components/navbar";
import ScrollToTop from "@/components/scroll-to-top";
import SiteFooter from "@/components/site-footer";
import { SITE } from "@/app/site-config";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: SITE.title,
    template: `%s · ${SITE.title}`,
  },
  description: SITE.description,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE.title,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <NavbarComponent />
          {children}
          <SiteFooter className="xl:hidden" />
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
