"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Icon } from "@/components/icons";
import {
  CURRENCIES,
  type Currency,
  formatCurrency,
  getCurrencyInfo,
} from "@/types/currency";

interface CurrencySelectProps {
  value: string;
  exclude?: string;
  label: string;
  placeholder: string;
  emptyText: string;
  locale: "pt" | "en";
  disabled?: boolean;
  onChange: (code: string) => void;
}

function CurrencySelect({
  value,
  exclude,
  label,
  placeholder,
  emptyText,
  locale,
  disabled,
  onChange,
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = getCurrencyInfo(value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const filtered = CURRENCIES.filter((currency) => {
    if (currency.code === exclude) return false;
    if (!normalized) return true;
    return (
      currency.code.toLowerCase().includes(normalized) ||
      currency.name[locale].toLowerCase().includes(normalized)
    );
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.code ?? ""}`}
        disabled={disabled}
        onClick={() => {
          setOpen((value) => !value);
          setQuery("");
        }}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 px-2 text-sm font-bold text-indigo-700">
          {selected?.symbol ?? ""}
        </span>
        <span className="flex-1 text-left">
          <span className="block text-sm font-semibold">{selected?.code}</span>
          <span className="block text-xs text-slate-500">
            {selected?.name[locale]}
          </span>
        </span>
        <Icon
          name="chevronDown"
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
              <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">{emptyText}</li>
            )}
            {filtered.map((currency: Currency) => (
              <li key={currency.code} role="option" aria-selected={currency.code === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(currency.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50 ${
                    currency.code === value ? "bg-indigo-50" : ""
                  }`}
                >
                  <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-bold text-slate-700">
                    {currency.symbol}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {currency.code}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {currency.name[locale]}
                    </span>
                  </span>
                  {currency.code === value && (
                    <Icon name="check" className="h-4 w-4 text-indigo-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface RateResponse {
  rate?: number;
  result?: number;
  base?: string;
  target?: string;
  timestamp?: string;
  date?: string;
  error?: string;
}

function timestampLocale(lang: "pt" | "en"): string {
  return lang === "pt" ? "pt-BR" : "en-US";
}

export function CurrencyExchangeCalculator() {
  const { t, lang } = useI18n();
  const [fromCurrency, setFromCurrency] = useState("BRL");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState<RateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount);
  const isAmountValid = Number.isFinite(value) && value > 0;

  useEffect(() => {
    if (!isAmountValid) return;

    const controller = new AbortController();
    let active = true;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/exchange-rate?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}&amount=${encodeURIComponent(amount)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as RateResponse;
        if (!active) return;
        if (data.error) {
          setError(data.error);
          setResult(null);
        } else {
          setResult(data);
          setError(null);
        }
      } catch (err) {
        if (!active) return;
        if (
          err instanceof DOMException &&
          (err.name === "AbortError" || err.name === "TimeoutError")
        ) {
          return;
        }
        setError(t("currencyExchange.error"));
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fromCurrency, toCurrency, amount, isAmountValid, t]);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/[^0-9.]/g, "");
    setAmount(sanitized);
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const fromInfo = getCurrencyInfo(fromCurrency);
  const toInfo = getCurrencyInfo(toCurrency);

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          {t("currencyExchange.title")}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Icon name="wallet" className="h-3.5 w-3.5" />
          {t("carousel.currencyExchange")}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("currencyExchange.fromLabel")}
          </label>
          <CurrencySelect
            value={fromCurrency}
            label={t("currencyExchange.fromLabel")}
            placeholder={t("currencyExchange.searchPlaceholder")}
            emptyText={t("currencyExchange.noResults")}
            locale={lang}
            disabled={loading}
            onChange={setFromCurrency}
          />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swapCurrencies}
            disabled={loading}
            aria-label={t("currencyExchange.swap")}
            title={t("currencyExchange.swap")}
            className="rounded-full border border-slate-200 bg-slate-50 p-2.5 text-slate-500 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4 4 4m6 4v12m0 0 4-4m-4 4-4-4" />
            </svg>
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("currencyExchange.toLabel")}
          </label>
          <CurrencySelect
            value={toCurrency}
            exclude={fromCurrency}
            label={t("currencyExchange.toLabel")}
            placeholder={t("currencyExchange.searchPlaceholder")}
            emptyText={t("currencyExchange.noResults")}
            locale={lang}
            disabled={loading}
            onChange={setToCurrency}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("currencyExchange.amountLabel")}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              {fromInfo?.symbol ?? ""}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              autoComplete="off"
              aria-label={t("currencyExchange.amountLabel")}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-right text-sm font-semibold text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {isAmountValid && result && result.result != null && result.rate != null && toInfo && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                {t("currencyExchange.resultLabel")}
              </span>
              {result.timestamp && (
                <span className="text-xs text-slate-400">
                  {t("currencyExchange.rateTimestamp", {
                    timestamp: new Date(result.timestamp).toLocaleString(
                      timestampLocale(lang),
                    ),
                  })}
                </span>
              )}
            </div>
            <div className="mt-1 text-3xl font-bold text-indigo-700">
              {formatCurrency(result.result, toCurrency, lang)}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              1 {fromCurrency} = {result.rate.toFixed(4)} {toCurrency}
            </p>
          </div>
        )}

        {isAmountValid && error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-medium text-indigo-700">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/40 border-t-indigo-600"
              aria-hidden="true"
            />
            {t("currencyExchange.loading")}
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrencyExchangeCalculator;