import { NextResponse } from "next/server";
import { extractJson } from "@/utils/extractJson";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import type {
  ApiLang,
  BudgetLevel,
  GerarRoteiroInput,
  Roteiro,
} from "@/types/itinerary";

const FREEAI_API_URL = "https://api.free.ai/v1/chat/completions";
const DEFAULT_MODEL = "qwen7b";
const BUDGET_LEVELS: BudgetLevel[] = ["baixo", "medio", "alto"];
const API_LANGS: ApiLang[] = ["pt", "en"];
const API_KEY = "sk-free-40a15a175c455ea7406c5e9cce4c9b71d1be670f5738d147";
const PLAN_LIMITS = {
  single: 1,
  fortnightly: 3,
  monthly: 10,
} as const;

function validatePlan(plan: string | null, planExpiry: string | null): { valid: boolean; message?: string; remaining: number } {
  if (!plan || !planExpiry) {
    return { valid: false, message: 'Nenhum plano ativo. Adquira um plano para gerar roteiros.', remaining: 0 };
  }

  const now = new Date();

  if (new Date(planExpiry) < now) {
    return { valid: false, message: 'Seu plano expirou. Renove para continuar gerando roteiros.', remaining: 0 };
  }

  const planType = plan as 'single' | 'fortnightly' | 'monthly';
  const maxItineraries = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 0;

  if (plan === 'single') {
    return { valid: true, message: undefined, remaining: 1 };
  }

  return { valid: true, message: undefined, remaining: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 0 };
}

const SYSTEM_PROMPTS: Record<ApiLang, string> = {
  pt: `Você é um especialista em planejamento de viagens do aplicativo "RutawayNow".

Sua tarefa é criar um roteiro diário detalhado para a viagem solicitada pelo usuário.

REGRAS OBRIGATÓRIAS:
1. Responda ESTRITAMENTE em JSON estruturado, sem markdown, sem blocos de código, sem texto extra antes ou depois.
2. O JSON deve conter exatamente um dia para cada dia solicitado de viagem, dentro do array "dias", na ordem cronológica.
3. Cada dia deve ter um array "atracoes" com atividades/atrações preenchidas para todos os horários do dia.
4. Para cada atração, use os campos exatos: "horario" (formato HH:MM, ex.: "09:00"), "nome_da_atracao", "descricao_curta" (uma frase curta) e "categoria".
5. O campo "categoria" deve SEMPRE ser uma das seguintes, sem tradução: "Aventura", "Gastronomia", "Cultura", "Natureza", "Passeio" ou "Relaxamento".
6. Distribua as atrações ao longo do dia (manhã, almoço, tarde e noite), variando os horários.
7. Priorize os estilos de viagem informados pelo usuário na escolha das atrações, misturando-os de forma equilibrada.
8. Escreva o "titulo" de cada dia e a "descricao_curta" de cada atração em português do Brasil.
9. NÃO traduza nomes próprios de lugares, atrações, bairros, praias, restaurantes ou hotéis: mantenha os nomes originais locais (ex.: "Praia Mole", "Ilha do Campeche").
10. Considere o mês da viagem informado para recomendar atrações adequadas à estação do ano, ao clima e à sazonalidade do destino.
11. Ajuste o roteiro ao orçamento informado (baixo, médio ou alto), escolhendo hospedagens, refeições e experiências compatíveis com o nível de gasto.
12. Considere a quantidade de adultos, adolescentes e crianças do grupo, adequando o ritmo do roteiro e garantindo atrações adequadas a todas as idades.
13. Inclua coordenadas geográficas reais aproximadas (latitude e longitude, valores decimais) para o destino e para cada atração, consistentes com a região do local.
14. As coordenadas devem variar entre as atrações para refletir locais diferentes no mapa.
15. Inclua os seguintes campos adicionais para cada atração: "duracao" (ex: "2 horas"), "custo_estimado" (ex: "R$ 50 por pessoa"), "link" (site oficial ou página, se disponível), "telefone" (contato, se disponível), "horario_funcionamento" (horário de abertura/fechamento), "dicas" (dica prática curta).

Retorne APENAS o objeto JSON no formato abaixo:
{
  "destino": "<destino>",
  "latitude": <número decimal>,
  "longitude": <número decimal>,
  "dias": [
    {
      "dia": 1,
      "titulo": "<título resumido do dia>",
      "atracoes": [
        {
          "horario": "HH:MM",
          "nome_da_atracao": "...",
          "descricao_curta": "...",
          "categoria": "...",
          "latitude": <número decimal>,
          "longitude": <número decimal>,
          "duracao": "...",
          "custo_estimado": "...",
          "link": "...",
          "telefone": "...",
          "horario_funcionamento": "...",
          "dicas": "..."
        }
      ]
    }
  ]
}`,
  en: `You are a travel planning expert for the "RutawayNow" app.

Your task is to create a detailed daily itinerary for the trip requested by the user.

MANDATORY RULES:
1. Respond STRICTLY with structured JSON, no markdown, no code blocks, no extra text before or after.
2. The JSON must contain exactly one day for each requested day of the trip, inside the "dias" array, in chronological order.
3. Each day must have an "atracoes" array filled with activities/attractions for all times of the day.
4. For each attraction, use the exact fields: "horario" (format HH:MM, e.g. "09:00"), "nome_da_atracao", "descricao_curta" (one short sentence) and "categoria".
5. The "categoria" field must ALWAYS be one of the following, without translation: "Aventura", "Gastronomia", "Cultura", "Natureza", "Passeio" or "Relaxamento".
6. Spread the attractions throughout the day (morning, lunch, afternoon and evening), varying the times.
7. Prioritize the travel styles informed by the user when choosing attractions, mixing them in a balanced way.
8. Write the "titulo" of each day and the "descricao_curta" of each attraction in English.
9. DO NOT translate proper nouns of places, attractions, neighborhoods, beaches, restaurants or hotels: keep the original local names (e.g. "Praia Mole", "Ilha do Campeche").
10. Consider the informed travel month to recommend attractions suitable for the season, climate and seasonality of the destination.
11. Adjust the itinerary to the informed budget (low, medium or high), choosing accommodations, meals and experiences compatible with the spending level.
12. Consider the number of adults, teens and children in the group, adjusting the pace of the itinerary and ensuring attractions suitable for all ages.
13. Include approximate real geographic coordinates (latitude and longitude, decimal values) for the destination and each attraction, consistent with the region of the location.
14. Coordinates must vary between attractions to reflect different places on the map.
15. Include the following extra fields for each attraction: "duracao" (e.g. "2 hours"), "custo_estimado" (e.g. "R$ 50 per person"), "link" (official website URL if available), "telefone" (contact phone if available), "horario_funcionamento" (opening hours), "dicas" (short practical tip).

Return ONLY the JSON object in the format below:
{
  "destino": "<destino>",
  "latitude": <decimal number>,
  "longitude": <decimal number>,
  "dias": [
    {
      "dia": 1,
      "titulo": "<short title of the day>",
      "atracoes": [
        {
          "horario": "HH:MM",
          "nome_da_atracao": "...",
          "descricao_curta": "...",
          "categoria": "...",
          "latitude": <decimal number>,
          "longitude": <decimal number>,
          "duracao": "...",
          "custo_estimado": "...",
          "link": "...",
          "telefone": "...",
          "horario_funcionamento": "...",
          "dicas": "..."
        }
      ]
    }
  ]
}`,
};

const USER_PROMPTS: Record<
  ApiLang,
  (input: {
    destination: string;
    days: number;
    month: string;
    budget: string;
    adults: number;
    teens: number;
    children: number;
    styles: string[];
  }) => string
> = {
  pt: ({ destination, days, month, budget, adults, teens, children, styles }) =>
    `Monte um roteiro para a seguinte viagem:
- Destino: ${destination}
- Quantidade de dias: ${days}
- Mês da viagem: ${month}
- Orçamento: ${budget}
- Grupo: ${adults} adulto(s), ${teens} adolescente(s), ${children} criança(s)
- Estilos de viagem desejados: ${styles.join(", ")}`,
  en: ({ destination, days, month, budget, adults, teens, children, styles }) =>
    `Create an itinerary for the following trip:
- Destination: ${destination}
- Number of days: ${days}
- Travel month: ${month}
- Budget: ${budget}
- Group: ${adults} adult(s), ${teens} teen(s), ${children} child(ren)
- Desired travel styles: ${styles.join(", ")}`,
};

const ERRORS: Record<ApiLang, Record<string, string>> = {
  pt: {
    destinationRequired: "O destino é obrigatório.",
    monthRequired: "O mês da viagem é obrigatório.",
    daysInvalid:
      "A quantidade de dias deve ser um número inteiro entre 1 e 30.",
    travelersInvalid:
      "As quantidades de adultos (mín. 1), adolescentes e crianças devem ser números inteiros entre 0 e 50.",
    budgetInvalid: "O orçamento deve ser 'baixo', 'medio' ou 'alto'.",
    stylesRequired: "Escolha pelo menos um estilo de viagem.",
    apiKeyMissing: "MANGAI_API_KEY não está configurada no ambiente.",
    apiFailed: "Falha ao gerar o roteiro. Tente novamente em instantes.",
    noValidItinerary: "Erro ao retornar o roteiro, tente novamente mais tarde.",
    unexpected: "Erro inesperado ao gerar o roteiro.",
  },
  en: {
    destinationRequired: "Destination is required.",
    monthRequired: "Travel month is required.",
    daysInvalid: "Number of days must be an integer between 1 and 30.",
    travelersInvalid:
      "Counts of adults (min. 1), teens and children must be integers between 0 and 50.",
    budgetInvalid: "Budget must be 'baixo', 'medio' or 'alto'.",
    stylesRequired: "Choose at least one travel style.",
    apiKeyMissing: "MANGAI_API_KEY is not configured in the environment.",
    apiFailed:
      "Failed to generate the itinerary. Please try again in a moment.",
    noValidItinerary: "Error returning the itinerary, please try again later.",
    unexpected: "Unexpected error while generating the itinerary.",
  },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<GerarRoteiroInput>
    | null;

  const destination =
    typeof body?.destination === "string" ? body.destination.trim() : "";
  const days = Number(body?.days);
  const month = typeof body?.month === "string" ? body.month.trim() : "";
  const lang: ApiLang =
    typeof body?.lang === "string" && API_LANGS.includes(body.lang as ApiLang)
      ? (body.lang as ApiLang)
      : "pt";
  const budget =
    typeof body?.budget === "string" &&
    BUDGET_LEVELS.includes(body.budget as BudgetLevel)
      ? (body.budget as BudgetLevel)
      : null;
  const adults = Number(body?.adults);
  const teens = Number(body?.teens);
  const children = Number(body?.children);
  const styles = Array.isArray(body?.styles)
    ? body.styles.filter((style): style is string => typeof style === "string")
    : [];

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

  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return NextResponse.json({ error: errors.daysInvalid }, { status: 400 });
  }

  if (
    !Number.isInteger(adults) ||
    adults < 1 ||
    adults > 50 ||
    !Number.isInteger(teens) ||
    teens < 0 ||
    teens > 50 ||
    !Number.isInteger(children) ||
    children < 0 ||
    children > 50
  ) {
    return NextResponse.json(
      { error: errors.travelersInvalid },
      { status: 400 },
    );
  }

  if (!budget) {
    return NextResponse.json({ error: errors.budgetInvalid }, { status: 400 });
  }

  if (styles.length === 0) {
    return NextResponse.json({ error: errors.stylesRequired }, { status: 400 });
  }

  // Validate user's plan
  const plan = body?.plan as string | undefined;
  const planExpiry = body?.planExpiry as string | undefined;
  const planValidation = validatePlan(plan || null, planExpiry || null);
  if (!planValidation.valid) {
    return NextResponse.json(
      { error: planValidation.message || 'Plano inválido ou sem créditos.' },
      { status: 403 },
    );
  }

  // Mangaai doesn't require API key

  const userPrompt = USER_PROMPTS[lang]({
    destination,
    days,
    month,
    budget,
    adults,
    teens,
    children,
    styles,
  });

  try {
    const model = process.env.FREEAI_MODEL ?? DEFAULT_MODEL;
    const response = await fetchWithRetry(FREEAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer ${sk-free-40a15a175c455ea7406c5e9cce4c9b71d1be670f5738d147}",
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
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[itinerary] Free.ai responded ${response.status}: ${errorText}`,
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
      candidates?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (data.error) {
      console.error(`[itinerary] Free.ai error: ${data.error.message}`);
      return NextResponse.json(
        { error: errors.apiFailed },
        { status: 502 },
      );
    }

    const content = data.candidates?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: errors.noValidItinerary },
        { status: 502 },
      );
    }

    let itinerary: Roteiro;
    try {
      itinerary = JSON.parse(content) as Roteiro;
    } catch {
      console.error("[itinerary] JSON parse failed, raw content:", content.substring(0, 500));
      return NextResponse.json(
        { error: errors.noValidItinerary },
        { status: 502 },
      );
    }

    return NextResponse.json(itinerary);
  } catch (error) {
    console.error("[itinerary] Erro inesperado:", error);
    return NextResponse.json(
      { error: errors.unexpected },
      { status: 500 },
    );
  }
}