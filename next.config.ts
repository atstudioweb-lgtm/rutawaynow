import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "lightningcss",
    "lightningcss-win32-x64-msvc",
    "@tailwindcss/oxide",
    "@tailwindcss/oxide-win32-x64-msvc",
    "@next/swc-win32-x64-msvc",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
