import { MetadataRoute } from "next";
import { SITE } from "@/app/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.title,
    short_name: SITE.shortTitle,
    dir: "auto",
    description: SITE.description,
    categories: ["blog"],
    theme_color: "#f4efe7",
    background_color: "#f4efe7",
    display: "standalone",
    scope: "/",
    lang: "zh-CN",
    start_url: "/",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "300x300",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "300x300",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
