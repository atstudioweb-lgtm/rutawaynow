"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Icon } from "@/components/icons";
import { resolveAirport, type Airport } from "@/lib/flights/airports";
import { buildAviasalesUrl } from "@/lib/flights/aviasales";

type TripType = "oneWay" | "roundTrip";

function todayInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function displayCity(airport: Airport, locale: "pt" | "en"): string {
  return locale === "pt" ? airport.city : airport.cityEn ?? airport.city;
}

function displayCountry(airport: Airport, locale: "pt" | "en"): string {
  return locale === "pt" ? airport.country : airport.countryEn ?? airport.country;
}

interface AirportSelectProps {
  label: string;
  value: string;
  placeholder: string;
  noResults: string;
  locale: "pt" | "en";
  onChange: (value: string) => void;
}

function AirportSelect({
  label,
  value,
  placeholder,
  noResults,
  locale,
  onChange,
}: AirportSelectProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    const query = value.trim();
    if (!open || !query) return;

    const controller = new AbortController();
    let active = true;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/airports?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { airports?: Airport[] };
        if (!active) return;
        setSuggestions(data.airports ?? []);
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [value, open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500">
        <Icon name="mapPin" className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {loading && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-400/40 border-t-indigo-600"
            aria-hidden="true"
          />
        )}
      </div>

      {open && value.trim() && (
        <ul
          role="listbox"
          className="absolute inset-x-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          {!loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">{noResults}</li>
          )}
          {suggestions.map((airport) => (
            <li key={airport.code}>
              <button
                type="button"
                onClick={() => {
                  onChange(airport.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50"
              >
                <span className="inline-flex h-7 min-w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-bold text-slate-700">
                  {airport.code}
                </span>
                <span className="flex-1 leading-tight">
                  <span className="block text-sm font-semibold text-slate-900">
                    {displayCity(airport, locale)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {displayCountry(airport, locale)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FlightsSearch() {
  const { t, lang } = useI18n();
  const [tripType, setTripType] = useState<TripType>("roundTrip");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const minDate = todayInput();

  const swapAirports = () => {
    setFrom(to);
    setTo(from);
  };

  const handleSearch = () => {
    setError(null);
    const fromText = from.trim();
    const toText = to.trim();

    if (!fromText) {
      setError(t("flights.fromRequired"));
      return;
    }
    if (!toText) {
      setError(t("flights.toRequired"));
      return;
    }

    const fromAirport = resolveAirport(fromText);
    const toAirport = resolveAirport(toText);
    if (!fromAirport) {
      setError(t("flights.unknownAirport"));
      return;
    }
    if (!toAirport) {
      setError(t("flights.unknownAirport"));
      return;
    }
    if (fromAirport.code === toAirport.code) {
      setError(t("flights.sameAirport"));
      return;
    }
    if (!departDate) {
      setError(t("flights.dateRequired"));
      return;
    }
    if (tripType === "roundTrip" && !returnDate) {
      setError(t("flights.returnDateRequired"));
      return;
    }
    if (tripType === "roundTrip" && returnDate < departDate) {
      setError(t("flights.returnAfterDeparture"));
      return;
    }

    const url = buildAviasalesUrl({
      origin: fromAirport.code,
      destination: toAirport.code,
      departDate,
      returnDate: tripType === "roundTrip" ? returnDate : null,
      lang,
    });
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          {t("flights.title")}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Icon name="plane" className="h-3.5 w-3.5" />
          {t("carousel.flights")}
        </span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            aria-pressed={tripType === "oneWay"}
            onClick={() => setTripType("oneWay")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tripType === "oneWay"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t("flights.oneWay")}
          </button>
          <button
            type="button"
            aria-pressed={tripType === "roundTrip"}
            onClick={() => setTripType("roundTrip")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tripType === "roundTrip"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t("flights.roundTrip")}
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("flights.fromLabel")}
          </label>
          <AirportSelect
            label={t("flights.fromLabel")}
            value={from}
            placeholder={t("flights.searchPlaceholder")}
            noResults={t("flights.noResults")}
            locale={lang}
            onChange={setFrom}
          />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swapAirports}
            aria-label={t("flights.swap")}
            title={t("flights.swap")}
            className="rounded-full border border-slate-200 bg-slate-50 p-2.5 text-slate-500 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4 4 4m6 4v12m0 0 4-4m-4 4-4-4" />
            </svg>
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("flights.toLabel")}
          </label>
          <AirportSelect
            label={t("flights.toLabel")}
            value={to}
            placeholder={t("flights.searchPlaceholder")}
            noResults={t("flights.noResults")}
            locale={lang}
            onChange={setTo}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("flights.departureDate")}
            </label>
            <input
              type="date"
              value={departDate}
              min={minDate}
              onChange={(event) => setDepartDate(event.target.value)}
              aria-label={t("flights.departureDate")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {tripType === "roundTrip" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("flights.returnDate")}
              </label>
              <input
                type="date"
                value={returnDate}
                min={departDate || minDate}
                onChange={(event) => setReturnDate(event.target.value)}
                aria-label={t("flights.returnDate")}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700"
        >
          <Icon name="search" className="h-4 w-4" />
          {t("flights.search")}
        </button>

        <p className="text-center text-xs text-slate-500">{t("flights.opensAt")}</p>
      </div>
    </div>
  );
}

export default FlightsSearch;