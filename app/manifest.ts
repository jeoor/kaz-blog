import { MetadataRoute } from "next";
import { SITE } from "@/app/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.title,
    short_name: SITE.title,
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
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
