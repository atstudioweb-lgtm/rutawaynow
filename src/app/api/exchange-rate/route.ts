import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_CURRENCIES = new Set([
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "ARS",
  "CLP",
  "COP",
  "UYU",
  "MXN",
  "AUD",
  "CHF",
]);

function parseAmount(raw: string | null): number | null {
  if (!raw) return 1;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim().toUpperCase();
  const to = searchParams.get("to")?.trim().toUpperCase();
  const amount = parseAmount(searchParams.get("amount"));

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Parâmetros "from" e "to" são obrigatórios.' },
      { status: 400 },
    );
  }

  if (!SUPPORTED_CURRENCIES.has(from) || !SUPPORTED_CURRENCIES.has(to)) {
    return NextResponse.json(
      {
        error: `Moeda não suportada. Moedas disponíveis: ${Array.from(SUPPORTED_CURRENCIES).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  if (amount === null) {
    return NextResponse.json(
      { error: 'Parâmetro "amount" deve ser um número maior que zero.' },
      { status: 400 },
    );
  }

  if (from === to) {
    return NextResponse.json({
      rate: 1,
      result: amount,
      base: from,
      target: to,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
    });
  }

  try {
    const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };

    const rate = data.rates?.[to];
    if (typeof rate !== "number" || !Number.isFinite(rate)) {
      throw new Error(`Rate not found for ${from} -> ${to}`);
    }

    return NextResponse.json({
      rate,
      result: Number((amount * rate).toFixed(2)),
      base: data.base ?? from,
      target: to,
      timestamp: new Date().toISOString(),
      date: data.date,
    });
  } catch (err) {
    console.error("Exchange rate error:", err);
    return NextResponse.json(
      { error: "Falha ao obter a taxa de câmbio. Tente novamente mais tarde." },
      { status: 500 },
    );
  }
}