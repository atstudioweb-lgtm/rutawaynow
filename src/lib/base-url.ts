const DEFAULT_URL = "https://rutawaynow.com";

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production") return DEFAULT_URL;
  return "http://localhost:3000";
}