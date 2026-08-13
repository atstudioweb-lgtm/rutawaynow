import { NextResponse } from "next/server";
import type { ApiLang, Checklist } from "@/types/itinerary";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
const API_LANGS: ApiLang[] = ["pt", "en"];

type TranslateChecklistInput = {
  checklist: Checklist;
  lang: ApiLang;
};

const SYSTEM_PROMPTS: Record<ApiLang, string> = {
  pt: `Você é um especialista em tradução de viagens do aplicativo "RutawayNow".
Sua tarefa é traduzir os textos do checklist para o português do Brasil, mantendo a estrutura JSON exata e todos os valores não-textuais inalterados.

REGRAS OBRIGATÓRIAS:
1. Responda ESTRITAMENTE em JSON estruturado, sem markdown, sem blocos de código, sem texto extra antes ou depois.
2. Mantenha a estrutura JSON idêntica à entrada: "destino", "periodo", "categorias" → "categoria", "itens".
3. Traduza para português do Brasil apenas os campos de texto: "destino", "periodo" e cada item em "itens".
4. NÃO traduza: "categoria" (mantenha as chaves originais como "Documentos", "Saúde", "Vestuário", "Orçamento").
5. NÃO traduza nomes próprios (cidades, países, vacinas ou documentos oficiais): mantenha os nomes originais.
6. Mantenha a ordem e o número de itens por categoria exatamente como na entrada.`,
  en: `You are a travel translation expert for the "RutawayNow" app.
Your task is to translate the checklist texts to English, keeping the exact JSON structure and all non-textual values unchanged.

MANDATORY RULES:
1. Respond STRICTLY with structured JSON, no markdown, no code blocks, no extra text before or after.
2. Keep the JSON structure identical to the input: "destino", "periodo", "categorias" → "categoria", "itens".
3. Translate to English only the text fields: "destino", "periodo" and each item in "itens".
4. DO NOT translate: "categoria" (keep the original keys like "Documentos", "Saúde", "Vestuário", "Orçamento").
5. DO NOT translate proper nouns (cities, countries, vaccines or official documents): keep the original names.
6. Keep the order and number of items per category exactly as in the input.`,
};

const translateChecklistSchema = {
  type: "object",
  properties: {
    destino: { type: "string" },
    periodo: { type: "string" },
    categorias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          categoria: { type: "string" },
          itens: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["categoria", "itens"],
        additionalProperties: false,
      },
    },
  },
  required: ["destino", "periodo", "categorias"],
  additionalProperties: false,
};

const ERRORS: Record<ApiLang, Record<string, string>> = {
  pt: {
    checklistRequired: "O checklist é obrigatório.",
    apiKeyMissing: "GEMINI_API_KEY não está configurada no ambiente.",
    geminiFailed: "Falha ao traduzir o checklist. Tente novamente em instantes.",
    noValidChecklist: "O Gemini não retornou um checklist válido.",
    unexpected: "Erro inesperado ao traduzir o checklist.",
  },
  en: {
    checklistRequired: "The checklist is required.",
    apiKeyMissing: "GEMINI_API_KEY is not configured in the environment.",
    geminiFailed: "Failed to translate the checklist. Please try again in a moment.",
    noValidChecklist: "Gemini did not return a valid checklist.",
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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: errors.apiKeyMissing },
      { status: 500 },
    );
  }

  const userPrompt = `Traduza os textos do seguinte checklist para ${lang === "pt" ? "português do Brasil" : "inglês"}, mantendo a estrutura JSON exata e todos os valores não-textuais inalterados. Não traduza os nomes das categorias (mantenha "Documentos", "Saúde", "Vestuário", "Orçamento"). Retorne APENAS o JSON:\n\n${JSON.stringify(checklist, null, 2)}`;

  try {
    const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPTS[lang] }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseJsonSchema: translateChecklistSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[translate-checklist] Gemini responded ${response.status}: ${errorText}`,
      );
      return NextResponse.json(
        { error: errors.geminiFailed },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return NextResponse.json(
        { error: errors.noValidChecklist },
        { status: 502 },
      );
    }

    const translated = JSON.parse(content) as Checklist;
    return NextResponse.json(translated);
  } catch (error) {
    console.error("[translate-checklist] Erro inesperado:", error);
    return NextResponse.json(
      { error: errors.unexpected },
      { status: 500 },
    );
  }
}
