import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSortedPostsData } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function normalizeBaseUrl(value: string): string {
  return String(value || "").trim().replace(/\/+$/g, "");
}

function isLocalhostBase(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

function isProxyBase(value: string): boolean {
  const host = String(value || "").replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  return host.endsWith(".qcloudteo.com") || host.endsWith(".pages.dev");
}

function splitHeaderValues(value: string | null): string[] {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toBaseFromHost(host: string, protoHint: string): string {
  const proto = protoHint || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return normalizeBaseUrl(`${proto}://${host}`);
}

function pickBestBase(candidates: string[]): string {
  const normalized = candidates.map(normalizeBaseUrl).filter(Boolean);
  const publicBase = normalized.find((item) => !isLocalhostBase(item) && !isProxyBase(item));
  if (publicBase) return publicBase;

  const nonLocal = normalized.find((item) => !isLocalhostBase(item));
  if (nonLocal) return nonLocal;

  return normalized[0] || "";
}

async function resolveSiteBase(): Promise<string> {
  const configured = normalizeBaseUrl(getSiteUrl());

  const h = await headers();
  const forwardedProto = splitHeaderValues(h.get("x-forwarded-proto"))[0] || "";
  const forwardedHosts = splitHeaderValues(h.get("x-forwarded-host"));
  const originalHosts = splitHeaderValues(h.get("x-original-host"));
  const realHosts = splitHeaderValues(h.get("x-real-host"));
  const host = String(h.get("host") || "").trim();

  const hostCandidates = [...forwardedHosts, ...originalHosts, ...realHosts, host].filter(Boolean);
  const requestBases = hostCandidates.map((item) => toBaseFromHost(item, forwardedProto));

  const requestBase = pickBestBase(requestBases);
  const configuredBase = pickBestBase([configured]);

  if (configuredBase && !isProxyBase(configuredBase) && !isLocalhostBase(configuredBase)) return configuredBase;
  if (requestBase) return requestBase;
  if (configuredBase) return configuredBase;
  return "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSortedPostsData();
  const base = await resolveSiteBase();

  return [
    {
      url: `${base}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as
        | "monthly"
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "yearly"
        | "never",
      priority: 1,
    },
    {
      url: `${base}/archive`,
      lastModified: new Date(),
      changeFrequency: "monthly" as
        | "monthly"
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "yearly"
        | "never",
      priority: 0.6,
    },
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as
        | "monthly"
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "yearly"
        | "never",
      priority: 0.5,
    },
    {
      url: `${base}/links`,
      lastModified: new Date(),
      changeFrequency: "monthly" as
        | "monthly"
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "yearly"
        | "never",
      priority: 0.5,
    },
    ...posts.map((post: BlogPost) => ({
      url: `${base}/posts/${post.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as
        | "monthly"
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "yearly"
        | "never",
      priority: 1,
    })),
  ];
}

