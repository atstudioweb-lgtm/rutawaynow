"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { pt, type Messages } from "@/i18n/pt";
import { en } from "@/i18n/en";
import { LANGUAGES, type Language } from "@/i18n/languages";

const STORAGE_KEY = "rutawaynow-language";

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  messages: Messages;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveMessage(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (
      current != null &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return "pt";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "pt" || saved === "en" ? saved : "pt";
  });

  const setLang = (next: Language) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  const messages = lang === "en" ? en : pt;

  const t = (key: string, params?: Record<string, string | number>) => {
    const value = resolveMessage(messages, key);
    if (typeof value !== "string") return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (match, name: string) =>
      params[name] != null ? String(params[name]) : match,
    );
  };

  const value: I18nContextValue = { lang, setLang, messages, t };

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export { LANGUAGES };
