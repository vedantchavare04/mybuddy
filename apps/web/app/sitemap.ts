import type { MetadataRoute } from "next";

const siteUrl = "https://mybuddy.vedant-chavare.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl },
    { url: `${siteUrl}/privacy` }, 
  ];
}