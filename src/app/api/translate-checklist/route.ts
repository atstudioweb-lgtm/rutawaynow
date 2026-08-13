import { NextResponse } from "next/server";
import type { ApiLang, Checklist, ChecklistCategoria } from "@/types/itinerary";

const DEEPL_API_URL = "https://api-free.deepl.com/v1/translate";
const API_LANGS: ApiLang[] = ["pt", "en"];
const DEEPL_TARGET: Record<ApiLang, string> = {
  pt: "PT-BR",
  en: "EN-US",
};

type TranslateChecklistInput = {
  checklist: Checklist;
  lang: ApiLang;
};

const ERRORS: Record<ApiLang, Record<string, string>> = {
  pt: {
    checklistRequired: "O checklist é obrigatório.",
    apiKeyMissing: "DEEPL_API_KEY não está configurada no ambiente.",
    translationFailed: "Falha ao traduzir o checklist. Tente novamente em instantes.",
    unexpected: "Erro inesperado ao traduzir o checklist.",
  },
  en: {
    checklistRequired: "The checklist is required.",
    apiKeyMissing: "DEEPL_API_KEY is not configured in the environment.",
    translationFailed: "Failed to translate the checklist. Please try again in a moment.",
    unexpected: "Unexpected error while translating the checklist.",
  },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<TranslateChecklistInput>
    | null;

  const checklist =
    body && typeof body === "object" && body.checklist
      ? body.checklist
      : null;
  const lang: ApiLang =
    typeof body?.lang === "string" && API_LANGS.includes(body.lang as ApiLang)
      ? (body.lang as ApiLang)
      : "pt";

  const errors = ERRORS[lang];

  if (!checklist) {
    return NextResponse.json(
      { error: errors.checklistRequired },
      { status: 400 },
    );
  }

  if (!process.env.DEEPL_API_KEY) {
    return NextResponse.json(
      { error: errors.apiKeyMissing },
      { status: 500 },
    );
  }

  const targetLang = DEEPL_TARGET[lang];

  try {
    const translated: Checklist = {
      destino: await translateText(checklist.destino),
      periodo: await translateText(checklist.periodo),
      categorias: await Promise.all(
        checklist.categorias.map(
          async (categoria: ChecklistCategoria): Promise<ChecklistCategoria> => ({
            categoria: categoria.categoria,
            itens: await Promise.all(
              categoria.itens.map(async (item: string) => translateText(item)),
            ),
          }),
        ),
      ),
    };

    return NextResponse.json(translated);
  } catch (error) {
    console.error("[translate-checklist] Erro inesperado:", error);
    return NextResponse.json(
      { error: errors.unexpected },
      { status: 500 },
    );
  }

  async function translateText(text: string): Promise<string> {
    const response = await fetch(`${DEEPL_API_URL}?auth_key=${process.env.DEEPL_API_KEY}&text=${encodeURIComponent(text)}&target_lang=${targetLang}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      translations?: { text: string }[];
    };

    const translated = data.translations?.[0]?.text;
    if (!translated) {
      throw new Error("No translation returned");
    }

    return translated;
  }
}
