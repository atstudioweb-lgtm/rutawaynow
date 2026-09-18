import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rutawaynow.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      alternates: {
        languages: {
          "pt-BR": `${BASE_URL}/`,
          "en-US": `${BASE_URL}/`,
        },
      },
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified,
      alternates: {
        languages: {
          "pt-BR": `${BASE_URL}/pricing`,
          "en-US": `${BASE_URL}/pricing`,
        },
      },
    },
  ];
}