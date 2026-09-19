import type { Language } from "@/i18n/languages";

export interface FlightsSearchInput {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  lang: Language;
  cabin: string;
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

export interface CabinOption {
  value: string;
  labelKey: string;
  flightsClass: string;
  packagesClassType: string;
}

// Trip.com cabin options shared by the Flights and Flight + Hotel forms.
export const CABIN_OPTIONS: CabinOption[] = [
  { value: "economy", labelKey: "economy", flightsClass: "y", packagesClassType: "y" },
  { value: "economyPremium", labelKey: "economyPremium", flightsClass: "y,s", packagesClassType: "ys" },
  { value: "premiumEconomy", labelKey: "premiumEconomy", flightsClass: "s", packagesClassType: "s" },
  { value: "businessFirst", labelKey: "businessFirst", flightsClass: "c,f", packagesClassType: "cf" },
  { value: "business", labelKey: "business", flightsClass: "c", packagesClassType: "c" },
  { value: "first", labelKey: "first", flightsClass: "f", packagesClassType: "f" },
];

export function cabinByValue(value: string): CabinOption {
  return (
    CABIN_OPTIONS.find((option) => option.value === value) ??
    CABIN_OPTIONS[0]
  );
}

export function buildTripUrl({
  origin,
  destination,
  departDate,
  returnDate,
  lang,
  cabin,
}: FlightsSearchInput): string {
  const market = MARKETS[lang];
  const params = new URLSearchParams();
  params.set("dcity", origin.toLowerCase());
  params.set("acity", destination.toLowerCase());
  params.set("ddate", departDate);
  params.set("triptype", returnDate ? "rt" : "ow");
  if (returnDate) params.set("rdate", returnDate);
  params.set("class", cabinByValue(cabin).flightsClass);
  params.set("quantity", "1");
  params.set("locale", market.locale);
  params.set("curr", market.currency);
  withAffiliate(params);

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

export interface HotelSearchInput {
  tripCityId: number | null;
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  lang: Language;
}

// Falls back to the Trip.com hotels home when no numeric city ID is available.
export function buildTripHotelsSearchUrl(input: HotelSearchInput): string {
  if (input.tripCityId == null) {
    return buildTripHotelsUrl(input.lang);
  }
  const market = MARKETS[input.lang];
  const params = withAffiliate(new URLSearchParams());
  params.set("city", String(input.tripCityId));
  params.set("cityName", input.cityName);
  params.set("checkIn", input.checkIn);
  params.set("checkOut", input.checkOut);
  params.set("adult", String(input.adults));
  params.set("children", String(input.children));
  params.set("crn", String(input.rooms));
  params.set("barCurr", market.currency);
  params.set("locale", market.locale);
  return `${market.host}/hotels/list?${params.toString()}`;
}

export interface PackagesSearchInput {
  origin: string;
  destination: string;
  destinationName: string;
  tripCityId: number | null;
  departDate: string;
  returnDate: string;
  adults: number;
  children: number;
  rooms: number;
  isOversea: boolean;
  classType: string;
  lang: Language;
}

// Falls back to the Trip.com Flight + Hotel home when no numeric hotel city ID
// is available for the destination.
export function buildTripPackagesSearchUrl(input: PackagesSearchInput): string {
  if (input.tripCityId == null) {
    return buildTripPackagesUrl(input.lang);
  }
  const market = MARKETS[input.lang];
  const params = withAffiliate(new URLSearchParams());
  params.set("adult", String(input.adults));
  params.set("child", String(input.children));
  params.set("infants", "0");
  params.set("aCityCode", input.destination.toUpperCase());
  params.set("dCityCode", input.origin.toUpperCase());
  params.set("tripWay", "round-trip");
  params.set("classType", input.classType);
  params.set("dDate", input.departDate);
  params.set("rDate", input.returnDate);
  params.set("hCity", String(input.tripCityId));
  params.set("iDate", input.departDate);
  params.set("oDate", input.returnDate);
  params.set("room", String(input.rooms));
  params.set("sourceFrom", "IBUBundle_home");
  params.set("destinationName", input.destinationName);
  params.set("isOversea", String(input.isOversea));
  params.set("locale", market.locale);
  params.set("curr", market.currency);
  return `${market.host}/packages/list?${params.toString()}`;
}