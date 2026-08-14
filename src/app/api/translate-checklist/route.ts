import { NextResponse } from "next/server";
import type { ApiLang, Checklist, ChecklistCategoria } from "@/types/itinerary";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
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

async function translateBatch(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  const response = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[translate-checklist] DeepL responded ${response.status}: ${errorText}`);
    throw new Error(`DeepL API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    translations?: { text: string }[];
  };

  if (!data.translations || data.translations.length !== texts.length) {
    throw new Error("Translation count mismatch");
  }

  return data.translations.map((t) => t.text);
}

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
    const texts: string[] = [];
    const itemIndices: { catIndex: number; itemIndex: number; textIndex: number }[] = [];

    texts.push(checklist.destino);
    texts.push(checklist.periodo);

    checklist.categorias.forEach((cat: ChecklistCategoria, ci) => {
      cat.itens.forEach((item, ti) => {
        texts.push(item);
        itemIndices.push({ catIndex: ci, itemIndex: ti, textIndex: texts.length - 1 });
      });
    });

    const translated = await translateBatch(texts, targetLang);

    const result: Checklist = {
      destino: translated[0],
      periodo: translated[1],
      categorias: checklist.categorias.map(
        (categoria: ChecklistCategoria, ci: number): ChecklistCategoria => ({
          categoria: categoria.categoria,
          itens: categoria.itens.map((item: string, ti: number) => {
            const idx = itemIndices.find(
              (i) => i.catIndex === ci && i.itemIndex === ti,
            );
            return translated[idx!.textIndex];
          }),
        }),
      ),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[translate-checklist] Erro inesperado:", error);
    return NextResponse.json(
      {
        error: errors.unexpected,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
