import { NextResponse } from "next/server";
import type {
  ApiLang,
  Atracao,
  DiaRoteiro,
  Roteiro,
} from "@/types/itinerary";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
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
    console.error(`[translate] DeepL responded ${response.status}: ${errorText}`);
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
    const texts: string[] = [roteiro.destino];
    const dayTitleIndices: number[] = [];
    const atracaoRefs: {
      di: number;
      ai: number;
      nomeIdx: number;
      descIdx: number;
      duracaoIdx?: number;
      custoIdx?: number;
      linkIdx?: number;
      telefoneIdx?: number;
      horarioFuncIdx?: number;
      dicasIdx?: number;
    }[] = [];

    roteiro.dias.forEach((dia, di) => {
      dayTitleIndices.push(texts.length);
      texts.push(dia.titulo);
      dia.atracoes.forEach((atr, ai) => {
        const nomeIdx = texts.length;
        texts.push(atr.nome_da_atracao);
        const descIdx = texts.length;
        texts.push(atr.descricao_curta);
        const ref: { di: number; ai: number; nomeIdx: number; descIdx: number; duracaoIdx?: number; custoIdx?: number; linkIdx?: number; telefoneIdx?: number; horarioFuncIdx?: number; dicasIdx?: number } = {
          di, ai, nomeIdx, descIdx,
        };
        if (atr.duracao) {
          ref.duracaoIdx = texts.length;
          texts.push(atr.duracao);
        }
        if (atr.custo_estimado) {
          ref.custoIdx = texts.length;
          texts.push(atr.custo_estimado);
        }
        if (atr.link) {
          ref.linkIdx = texts.length;
          texts.push(atr.link);
        }
        if (atr.telefone) {
          ref.telefoneIdx = texts.length;
          texts.push(atr.telefone);
        }
        if (atr.horario_funcionamento) {
          ref.horarioFuncIdx = texts.length;
          texts.push(atr.horario_funcionamento);
        }
        if (atr.dicas) {
          ref.dicasIdx = texts.length;
          texts.push(atr.dicas);
        }
        atracaoRefs.push(ref);
      });
    });

    const translated = await translateBatch(texts, targetLang);

    const result: Roteiro = {
      destino: translated[0],
      latitude: roteiro.latitude,
      longitude: roteiro.longitude,
      dias: roteiro.dias.map((dia: DiaRoteiro, di: number): DiaRoteiro => ({
        dia: dia.dia,
        titulo: translated[dayTitleIndices[di]],
        atracoes: dia.atracoes.map((atr: Atracao, ai: number): Atracao => {
          const ref = atracaoRefs.find((r) => r.di === di && r.ai === ai)!;
          return {
            horario: atr.horario,
            nome_da_atracao: translated[ref.nomeIdx],
            descricao_curta: translated[ref.descIdx],
            categoria: atr.categoria,
            latitude: atr.latitude,
            longitude: atr.longitude,
            duracao: ref.duracaoIdx !== undefined ? translated[ref.duracaoIdx] : undefined,
            custo_estimado: ref.custoIdx !== undefined ? translated[ref.custoIdx] : undefined,
            link: ref.linkIdx !== undefined ? translated[ref.linkIdx] : undefined,
            telefone: ref.telefoneIdx !== undefined ? translated[ref.telefoneIdx] : undefined,
            horario_funcionamento: ref.horarioFuncIdx !== undefined ? translated[ref.horarioFuncIdx] : undefined,
            dicas: ref.dicasIdx !== undefined ? translated[ref.dicasIdx] : undefined,
          };
        }),
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[translate] Erro inesperado:", error);
    return NextResponse.json(
      { error: errors.unexpected },
      { status: 500 },
    );
  }
}
