import { NextResponse } from "next/server";
import { extractJson } from "@/utils/extractJson";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import type { ApiLang, Checklist, GerarChecklistInput } from "@/types/itinerary";

const MANGAI_API_URL = "https://api.mangaai.mangoi.in/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-r1";
const API_LANGS: ApiLang[] = ["pt", "en"];

const SYSTEM_PROMPTS: Record<ApiLang, string> = {
  pt: `Você é um especialista em planejamento de viagens do aplicativo "RutawayNow".

Sua tarefa é criar um checklist de viagem para o destino e o período solicitados.

REGRAS OBRIGATÓRIAS:
1. Responda ESTRITAMENTE em JSON estruturado, sem markdown, sem blocos de código, sem texto extra antes ou depois.
2. O checklist deve conter EXATAMENTE as quatro categorias abaixo, nesta ordem (não traduza os nomes das categorias):
   - "Documentos": documentos, burocracias e reservas necessárias (passaporte/visto quando aplicável, vacinas obrigatórias, seguro de viagem, reservas de hospedagem e transporte).
   - "Saúde": cuidados médicos, vacinas recomendadas, remédios, repelentes, protetor solar e farmácias locais, considerando a estação do ano no destino.
   - "Vestuário": roupas e calçados adequados ao clima da época do ano no destino.
   - "Orçamento": itens com o ORÇAMENTO MÍNIMO POR DIA estimado em reais (R$) por pessoa, incluindo transporte local, alimentação e hospedagem.
3. Escreva os itens de cada categoria em português do Brasil.
4. NÃO traduza nomes próprios (cidades, países, vacinas ou documentos oficiais): mantenha os nomes originais.
5. Seja específico ao destino e ao período/mês informado (clima, sazonalidade e exigências do país).
6. Cada categoria deve ter de 4 a 8 itens curtos e práticos.

Retorne APENAS o objeto JSON no formato abaixo:
{
  "destino": "<destino>",
  "periodo": "<período/mês informado>",
  "categorias": [
    { "categoria": "Documentos", "itens": ["...", "..."] },
    { "categoria": "Saúde", "itens": ["...", "..."] },
    { "categoria": "Vestuário", "itens": ["...", "..."] },
    { "categoria": "Orçamento", "itens": ["Orçamento mínimo por dia: R$ X por pessoa...", "..."] }
  ]
}`,
  en: `You are a travel planning expert for the "RutawayNow" app.

Your task is to create a travel checklist for the destination and period requested.

MANDATORY RULES:
1. Respond STRICTLY with structured JSON, no markdown, no code blocks, no extra text before or after.
2. The checklist must contain EXACTLY the four categories below, in this order (do not translate the category names):
   - "Documentos": documents, bureaucracy and necessary bookings (passport/visa when applicable, mandatory vaccines, travel insurance, accommodation and transport bookings).
   - "Saúde": health care, recommended vaccines, medications, insect repellent, sunscreen and local pharmacies, considering the season in the destination.
   - "Vestuário": clothes and footwear suitable for the climate of the season in the destination.
   - "Orçamento": items with the estimated MINIMUM DAILY BUDGET in reais (R$) per person, including local transport, food and accommodation.
3. Write the items of each category in English.
4. DO NOT translate proper nouns (cities, countries, vaccines or official documents): keep the original names.
5. Be specific to the destination and the informed period/month (climate, seasonality and country requirements).
6. Each category must have 4 to 8 short, practical items.

Return ONLY the JSON object in the format below:
{
  "destino": "<destino>",
  "periodo": "<informed period/month>",
  "categorias": [
    { "categoria": "Documentos", "itens": ["...", "..."] },
    { "categoria": "Saúde", "itens": ["...", "..."] },
    { "categoria": "Vestuário", "itens": ["...", "..."] },
    { "categoria": "Orçamento", "itens": ["Minimum daily budget: R$ X per person...", "..."] }
  ]
}`,
};

const USER_PROMPTS: Record<
  ApiLang,
  (input: { destination: string; month: string }) => string
> = {
  pt: ({ destination, month }) =>
    `Monte um checklist para a seguinte viagem:
- Destino: ${destination}
- Período: ${month}`,
  en: ({ destination, month }) =>
    `Create a checklist for the following trip:
- Destination: ${destination}
- Period: ${month}`,
};

const ERRORS: Record<ApiLang, Record<string, string>> = {
  pt: {
    destinationRequired: "O destino é obrigatório.",
    monthRequired: "O período da viagem é obrigatório.",
    apiKeyMissing: "MANGAI_API_KEY não está configurada no ambiente.",
    apiFailed: "Falha ao gerar o checklist. Tente novamente em instantes.",
    noValidChecklist: "A API não retornou um checklist válido.",
    unexpected: "Erro inesperado ao gerar o checklist.",
  },
  en: {
    destinationRequired: "Destination is required.",
    monthRequired: "Travel period is required.",
    apiKeyMissing: "MANGAI_API_KEY is not configured in the environment.",
    apiFailed:
      "Failed to generate the checklist. Please try again in a moment.",
    noValidChecklist: "The API did not return a valid checklist.",
    unexpected: "Unexpected error while generating the checklist.",
  },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<GerarChecklistInput>
    | null;

  const destination =
    typeof body?.destination === "string" ? body.destination.trim() : "";
  const month = typeof body?.month === "string" ? body.month.trim() : "";
  const lang: ApiLang =
    typeof body?.lang === "string" && API_LANGS.includes(body.lang as ApiLang)
      ? (body.lang as ApiLang)
      : "pt";

  const errors = ERRORS[lang];

  if (!destination) {
    return NextResponse.json(
      { error: errors.destinationRequired },
      { status: 400 },
    );
  }

  if (!month) {
    return NextResponse.json({ error: errors.monthRequired }, { status: 400 });
  }

  // Mangaai doesn't require API key, but keep env var check
  if (!process.env.MANGAI_API_KEY && process.env.MANGAI_API_KEY !== "") {
    return NextResponse.json(
      { error: errors.apiKeyMissing },
      { status: 500 },
    );
  }

  const userPrompt = USER_PROMPTS[lang]({ destination, month });

  try {
    const model = process.env.MANGAI_MODEL ?? DEFAULT_MODEL;
    const response = await fetchWithRetry(MANGAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPTS[lang],
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[checklist] Mangaai responded ${response.status}: ${errorText}`,
      );
      if (response.status === 429 || response.errorType === "rate_limit") {
        return NextResponse.json(
          { error: errors.rateLimitExceeded ?? errors.apiFailed },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: errors.apiFailed },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (data.error) {
      console.error(`[checklist] Mangaai error: ${data.error.message}`);
      return NextResponse.json(
        { error: errors.apiFailed },
        { status: 502 },
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: errors.noValidChecklist },
        { status: 502 },
      );
    }

    let checklist: Checklist;
    try {
      checklist = JSON.parse(extractJson(content)) as Checklist;
    } catch {
      console.error("[checklist] JSON parse failed, raw content:", content.substring(0, 500));
      return NextResponse.json(
        { error: errors.noValidChecklist },
        { status: 502 },
      );
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("[checklist] Erro inesperado:", error);
    return NextResponse.json(
      { error: errors.unexpected },
      { status: 500 },
    );
  }
}