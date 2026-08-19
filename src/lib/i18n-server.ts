import { pt } from '@/i18n/pt';
import { en } from '@/i18n/en';

export type Language = 'pt' | 'en';

const messages: Record<Language, Record<string, any>> = {
  pt,
  en,
};

function resolveMessage(messages: Record<string, any>, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (
      current != null &&
      typeof current === 'object' &&
      part in (current as Record<string, unknown>)
    ) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
}

export function getTranslation(lang: Language) {
  const messages = lang === 'en' ? en : pt;

  function t(key: string, params?: Record<string, string | number>): string {
    const value = resolveMessage(lang === 'en' ? en : pt, key);
    if (typeof value !== 'string') return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (match, name: string) =>
      params[name] != null ? String(params[name]) : match,
    );
  }

  return { t };
}