import { NextResponse } from "next/server";
import type { ApiLang, Roteiro } from "@/types/itinerary";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
const API_LANGS: ApiLang[] = ["pt", "en"];

type TranslateInput = {
  roteiro: Roteiro;
  lang: ApiLang;
};

const SYSTEM_PROMPTS: Record<ApiLang, string> = {
  pt: `Você é um especialista em tradução de viagens do aplicativo "RutawayNow".
Sua tarefa é traduzir os textos do roteiro para o português do Brasil, mantendo a estrutura JSON exata e todos os valores não-textuais (horários, coordenadas, categorias) inalterados.

REGRAS OBRIGATÓRIAS:
1. Responda ESTRITAMENTE em JSON estruturado, sem markdown, sem blocos de código, sem texto extra antes ou depois.
2. Mantenha a estrutura JSON idêntica à entrada: "destino", "latitude", "longitude", "dias" → "dia", "titulo", "atracoes" → "horario", "nome_da_atracao", "descricao_curta", "categoria", "latitude", "longitude".
3. Traduza para português do Brasil apenas os campos de texto: "destino", "titulo", "nome_da_atracao" e "descricao_curta".
4. NÃO traduza: "horario", "categoria", "latitude", "longitude", "dia".
5. NÃO traduza nomes próprios de lugares, atrações, bairros, praias, restaurantes ou hotéis: mantenha os nomes originais (ex.: "Praia Mole", "Ilha do Campeche").
6. Mantenha os valores numéricos (latitude/longitude/dia) exatamente como estão.
7. A categoria deve permanecer como na entrada (não traduzir).`,
  en: `You are a travel translation expert for the "RutawayNow" app.
Your task is to translate the itinerary texts to English, keeping the exact JSON structure and all non-textual values (times, coordinates, categories) unchanged.

MANDATORY RULES:
1. Respond STRICTLY with structured JSON, no markdown, no code blocks, no extra text before or after.
2. Keep the JSON structure identical to the input: "destino", "latitude", "longitude", "dias" → "dia", "titulo", "atracoes" → "horario", "nome_da_atracao", "descricao_curta", "categoria", "latitude", "longitude".
3. Translate to English only the text fields: "destino", "titulo", "nome_da_atracao" and "descricao_curta".
4. DO NOT translate: "horario", "categoria", "latitude", "longitude", "dia".
5. DO NOT translate proper nouns of places, attractions, neighborhoods, beaches, restaurants or hotels: keep the original names (e.g. "Praia Mole", "Ilha do Campeche").
6. Keep the numeric values (latitude/longitude/dia) exactly as they are.
7. The category should remain as in the input (not translated).`,
};


const ERRORS: Record<ApiLang, Record<string, string>> = {
  pt: {
    roteiroRequired: "O roteiro é obrigatório.",
    apiKeyMissing: "GEMINI_API_KEY não está configurada no ambiente.",
    geminiFailed: "Falha ao traduzir o roteiro. Tente novamente em instantes.",
    noValidItinerary: "O Gemini não retornou um roteiro válido.",
    unexpected: "Erro inesperado ao traduzir o roteiro.",
  },
  en: {
    roteiroRequired: "The itinerary is required.",
    apiKeyMissing: "GEMINI_API_KEY is not configured in the environment.",
    geminiFailed: "Failed to translate the itinerary. Please try again in a moment.",
    noValidItinerary: "Gemini did not return a valid itinerary.",
    unexpected: "Unexpected error while translating the itinerary.",
  },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<TranslateInput>
    | null;

  const roteiro =
    body && typeof body === "object" && body.roteiro ? body.roteiro : null;
  const lang: ApiLang =
    typeof body?.lang === "string" && API_LANGS.includes(body.lang as ApiLang)
      ? (body.lang as ApiLang)
      : "pt";

  const errors = ERRORS[lang];

  if (!roteiro) {
    return NextResponse.json(
      { error: errors.roteiroRequired },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: errors.apiKeyMissing },
      { status: 500 },
    );
  }

  const userPrompt = `Traduza os textos do seguinte roteiro para ${lang === "pt" ? "português do Brasil" : "inglês"}, mantendo a estrutura JSON exata e todos os valores numéricos, horários e categorias inalterados. Não traduza nomes próprios. Retorne APENAS o JSON:\n\n${JSON.stringify(roteiro, null, 2)}`;

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
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[translate] Gemini responded ${response.status}: ${errorText}`,
      );
      return NextResponse.json(
        { error: errors.geminiFailed, detail: errorText },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return NextResponse.json(
        { error: errors.noValidItinerary },
        { status: 502 },
      );
    }

    const translated = JSON.parse(content) as Roteiro;
    return NextResponse.json(translated);
  } catch (error) {
    console.error("[translate] Erro inesperado:", error);
    return NextResponse.json(
      { error: errors.unexpected },
      { status: 500 },
    );
  }
}
