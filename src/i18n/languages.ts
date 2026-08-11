export const LANGUAGES = [
  { code: "pt", label: "Português", shortLabel: "PT" },
  { code: "en", label: "English", shortLabel: "EN" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export type LanguageOption = (typeof LANGUAGES)[number];
