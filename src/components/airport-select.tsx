"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { type Airport } from "@/lib/flights/airports";

function displayCity(airport: Airport, locale: "pt" | "en"): string {
  return locale === "pt" ? airport.city : airport.cityEn ?? airport.city;
}

function displayCountry(airport: Airport, locale: "pt" | "en"): string {
  return locale === "pt" ? airport.country : airport.countryEn ?? airport.country;
}

export { displayCity as displayAirportCity, displayCountry as displayAirportCountry };

interface AirportSelectProps {
  label: string;
  value: string;
  placeholder: string;
  noResults: string;
  locale: "pt" | "en";
  onChange: (value: string) => void;
}

export function AirportSelect({
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