import { MetadataRoute } from "next";
import { getSortedPostsData } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSortedPostsData();
  const base = getSiteUrl();

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

