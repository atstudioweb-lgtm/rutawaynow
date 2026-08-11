import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "lightningcss",
    "lightningcss-win32-x64-msvc",
    "@tailwindcss/oxide",
    "@tailwindcss/oxide-win32-x64-msvc",
    "@next/swc-win32-x64-msvc",
  ],
};

export default nextConfig;
