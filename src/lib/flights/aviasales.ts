import type { Language } from "@/i18n/languages";

export interface FlightsSearchInput {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  lang: Language;
}

const MARKETS: Record<Language, { host: string; currency: string; locale: string }> = {
  pt: {
    host: "https://www.aviasales.com.br",
    currency: "BRL",
    locale: "pt",
  },
  en: {
    host: "https://www.aviasales.com",
    currency: "USD",
    locale: "en",
  },
};

export function formatDdmm(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}${month}`;
}

export function buildAviasalesUrl({
  origin,
  destination,
  departDate,
  returnDate,
  lang,
}: FlightsSearchInput): string {
  const market = MARKETS[lang];
  const departure = formatDdmm(departDate);
  const ret = returnDate ? formatDdmm(returnDate) : "";
  const code = `${origin}${departure}${destination}${ret}`;

  const params = new URLSearchParams();
  const marker = process.env.NEXT_PUBLIC_AVIASALES_MARKER;
  if (marker) params.set("marker", marker);
  params.set("curr", market.currency);
  params.set("locale", market.locale);

  return `${market.host}/search/${code}?${params.toString()}`;
}