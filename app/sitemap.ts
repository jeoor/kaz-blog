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

async function resolveSiteBase(): Promise<string> {
  const configured = normalizeBaseUrl(getSiteUrl());

  const h = await headers();
  const forwardedProto = String(h.get("x-forwarded-proto") || "").split(",")[0].trim();
  const forwardedHost = String(h.get("x-forwarded-host") || "").split(",")[0].trim();
  const host = forwardedHost || String(h.get("host") || "").trim();
  const proto = forwardedProto || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const requestBase = host ? normalizeBaseUrl(`${proto}://${host}`) : "";

  if (requestBase) return requestBase;
  if (configured && !isLocalhostBase(configured)) return configured;
  if (configured) return configured;
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

