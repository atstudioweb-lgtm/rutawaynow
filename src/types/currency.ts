export interface Currency {
  code: string;
  name: {
    pt: string;
    en: string;
  };
  symbol: string;
}

export const CURRENCIES: readonly Currency[] = [
  { code: "BRL", name: { pt: "Real Brasileiro", en: "Brazilian Real" }, symbol: "R$" },
  { code: "USD", name: { pt: "Dólar Americano", en: "US Dollar" }, symbol: "$" },
  { code: "EUR", name: { pt: "Euro", en: "Euro" }, symbol: "€" },
  { code: "GBP", name: { pt: "Libra Esterlina", en: "British Pound" }, symbol: "£" },
  { code: "JPY", name: { pt: "Iene Japonês", en: "Japanese Yen" }, symbol: "¥" },
  { code: "CAD", name: { pt: "Dólar Canadense", en: "Canadian Dollar" }, symbol: "CA$" },
  { code: "ARS", name: { pt: "Peso Argentino", en: "Argentine Peso" }, symbol: "AR$" },
  { code: "CLP", name: { pt: "Peso Chileno", en: "Chilean Peso" }, symbol: "CLP$" },
  { code: "COP", name: { pt: "Peso Colombiano", en: "Colombian Peso" }, symbol: "COP$" },
  { code: "UYU", name: { pt: "Peso Uruguaio", en: "Uruguayan Peso" }, symbol: "$U" },
  { code: "MXN", name: { pt: "Peso Mexicano", en: "Mexican Peso" }, symbol: "MX$" },
  { code: "AUD", name: { pt: "Dólar Australiano", en: "Australian Dollar" }, symbol: "A$" },
  { code: "CHF", name: { pt: "Franco Suíço", en: "Swiss Franc" }, symbol: "CHF" },
];

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const LOCALE_MAP: Record<"pt" | "en", string> = {
  pt: "pt-BR",
  en: "en-US",
};

export function getCurrencyInfo(code: string): Currency | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

export function getCurrencyName(code: string, locale: "pt" | "en" = "pt"): string {
  return getCurrencyInfo(code)?.name[locale] ?? code;
}

export function getCurrencySymbol(code: string): string {
  return getCurrencyInfo(code)?.symbol ?? "";
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: "pt" | "en" = "pt",
): string {
  const currency = getCurrencyInfo(currencyCode);
  if (!currency) return String(amount);

  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(LOCALE_MAP[locale], {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}