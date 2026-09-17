import type { Language } from "@/i18n/languages";

export interface FlightsSearchInput {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  lang: Language;
}

const MARKETS: Record<Language, { host: string; locale: string; currency: string }> = {
  pt: {
    host: "https://br.trip.com",
    locale: "pt-BR",
    currency: "BRL",
  },
  en: {
    host: "https://www.trip.com",
    locale: "en-US",
    currency: "USD",
  },
};

export function buildTripUrl({
  origin,
  destination,
  departDate,
  returnDate,
  lang,
}: FlightsSearchInput): string {
  const market = MARKETS[lang];
  const params = new URLSearchParams();
  params.set("dcity", origin.toLowerCase());
  params.set("acity", destination.toLowerCase());
  params.set("ddate", departDate);
  params.set("triptype", returnDate ? "rt" : "ow");
  if (returnDate) params.set("rdate", returnDate);
  params.set("class", "y");
  params.set("quantity", "1");
  params.set("locale", market.locale);
  params.set("curr", market.currency);

  const allianceId = process.env.NEXT_PUBLIC_TRIP_ALLIANCEID;
  const sid = process.env.NEXT_PUBLIC_TRIP_SID;
  if (allianceId && sid) {
    params.set("Allianceid", allianceId);
    params.set("SID", sid);
  }

  return `${market.host}/flights/showfarefirst?${params.toString()}`;
}

function withAffiliate(params: URLSearchParams) {
  const allianceId = process.env.NEXT_PUBLIC_TRIP_ALLIANCEID;
  const sid = process.env.NEXT_PUBLIC_TRIP_SID;
  if (allianceId && sid) {
    params.set("Allianceid", allianceId);
    params.set("SID", sid);
  }
  return params;
}

export function buildTripHotelsUrl(lang: Language): string {
  const market = MARKETS[lang];
  const params = withAffiliate(new URLSearchParams());
  params.set("locale", market.locale);
  params.set("curr", market.currency);
  return `${market.host}/hotels/?${params.toString()}`;
}

export function buildTripPackagesUrl(lang: Language): string {
  const market = MARKETS[lang];
  const params = withAffiliate(new URLSearchParams());
  params.set("sourceFrom", "IBUBundle_home");
  params.set("locale", market.locale);
  params.set("curr", market.currency);
  return `${market.host}/packages/?${params.toString()}`;
}