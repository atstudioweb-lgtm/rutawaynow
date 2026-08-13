import { NextResponse } from "next/server";
import type {
  ApiLang,
  Atracao,
  DiaRoteiro,
  Roteiro,
} from "@/types/itinerary";

const DEEPL_API_URL = "https://api-free.deepl.com/v1/translate";
const API_LANGS: ApiLang[] = ["pt", "en"];
const DEEPL_TARGET: Record<ApiLang, string> = {
  pt: "PT-BR",
  en: "EN-US",
};

type TranslateInput = {
  roteiro: Roteiro;
  lang: ApiLang;
};

const ERRORS: Record<ApiLang, Record<string, string>> = {
  pt: {
    roteiroRequired: "O roteiro é obrigatório.",
    apiKeyMissing: "DEEPL_API_KEY não está configurada no ambiente.",
    translationFailed: "Falha ao traduzir o roteiro. Tente novamente em instantes.",
    unexpected: "Erro inesperado ao traduzir o roteiro.",
  },
  en: {
    roteiroRequired: "The itinerary is required.",
    apiKeyMissing: "DEEPL_API_KEY is not configured in the environment.",
    translationFailed: "Failed to translate the itinerary. Please try again in a moment.",
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

  if (!process.env.DEEPL_API_KEY) {
    return NextResponse.json(
      { error: errors.apiKeyMissing },
      { status: 500 },
    );
  }

  const targetLang = DEEPL_TARGET[lang];

  try {
    const translated: Roteiro = {
      destino: await translateText(roteiro.destino),
      latitude: roteiro.latitude,
      longitude: roteiro.longitude,
      dias: await Promise.all(
        roteiro.dias.map(async (dia: DiaRoteiro): Promise<DiaRoteiro> => ({
          dia: dia.dia,
          titulo: await translateText(dia.titulo),
          atracoes: await Promise.all(
            dia.atracoes.map(async (atracao: Atracao): Promise<Atracao> => ({
              horario: atracao.horario,
              nome_da_atracao: await translateText(atracao.nome_da_atracao),
              descricao_curta: await translateText(atracao.descricao_curta),
              categoria: atracao.categoria,
              latitude: atracao.latitude,
              longitude: atracao.longitude,
            })),
          ),
        })),
      ),
    };

    return NextResponse.json(translated);
  } catch (error) {
    console.error("[translate] Erro inesperado:", error);
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
