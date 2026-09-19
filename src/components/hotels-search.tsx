"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Icon } from "@/components/icons";
import type { Destination } from "@/lib/travel/destinations";
import { buildTripHotelsSearchUrl } from "@/lib/flights/trip";

function todayInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function displayCity(destination: Destination, locale: "pt" | "en"): string {
  return locale === "pt" ? destination.cityPt : destination.cityEn;
}

function displayCountry(destination: Destination, locale: "pt" | "en"): string {
  return locale === "pt" ? destination.countryPt : destination.countryEn;
}

interface DestinationSelectProps {
  value: string;
  placeholder: string;
  noResults: string;
  locale: "pt" | "en";
  onChange: (destination: Destination | null) => void;
}

function DestinationSelect({
  value,
  placeholder,
  noResults,
  locale,
  onChange,
}: DestinationSelectProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
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
    const query = text.trim();
    if (!open || !query) return;

    const controller = new AbortController();
    let active = true;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/destinations?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as {
          destinations?: Destination[];
        };
        if (!active) return;
        setSuggestions(data.destinations ?? []);
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
  }, [text, open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500">
        <Icon name="mapPin" className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setText(event.target.value);
            onChange(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {loading && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-400/40 border-t-indigo-600"
            aria-hidden="true"
          />
        )}
      </div>

      {open && text.trim() && (
        <ul
          role="listbox"
          className="absolute inset-x-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          {!loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">{noResults}</li>
          )}
          {suggestions.map((destination) => (
            <li key={destination.tripCityId ?? `${destination.cityPt}-${destination.countryPt}`}>
              <button
                type="button"
                onClick={() => {
                  onChange(destination);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50"
              >
                <span className="flex-1 leading-tight">
                  <span className="block text-sm font-semibold text-slate-900">
                    {displayCity(destination, locale)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {displayCountry(destination, locale)}
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

export function HotelsSearch() {
  const { t, lang } = useI18n();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const minDate = todayInput();

  const handleSearch = () => {
    setError(null);
    if (!destination) {
      setError(t("hotels.destinationRequired"));
      return;
    }
    if (!checkIn) {
      setError(t("hotels.dateRequired"));
      return;
    }
    if (!checkOut) {
      setError(t("hotels.dateRequired"));
      return;
    }
    if (checkOut <= checkIn) {
      setError(t("hotels.checkoutAfterCheckin"));
      return;
    }

    const url = buildTripHotelsSearchUrl({
      tripCityId: destination.tripCityId,
      cityName: displayCity(destination, lang),
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
      lang,
    });
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          {t("hotels.title")}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Icon name="bed" className="h-3.5 w-3.5" />
          {t("carousel.hotels")}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("hotels.destinationLabel")}
          </label>
          <DestinationSelect
            value={destination ? displayCity(destination, lang) : ""}
            placeholder={t("hotels.destinationPlaceholder")}
            noResults={t("hotels.noResults")}
            locale={lang}
            onChange={setDestination}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("hotels.checkIn")}
            </label>
            <input
              type="date"
              value={checkIn}
              min={minDate}
              onChange={(event) => setCheckIn(event.target.value)}
              aria-label={t("hotels.checkIn")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("hotels.checkOut")}
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || minDate}
              onChange={(event) => setCheckOut(event.target.value)}
              aria-label={t("hotels.checkOut")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("hotels.adults")}
            </label>
            <select
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
              aria-label={t("hotels.adults")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("hotels.children")}
            </label>
            <select
              value={children}
              onChange={(event) => setChildren(Number(event.target.value))}
              aria-label={t("hotels.children")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("hotels.rooms")}
            </label>
            <select
              value={rooms}
              onChange={(event) => setRooms(Number(event.target.value))}
              aria-label={t("hotels.rooms")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
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
          {t("hotels.search")}
        </button>

        <p className="text-center text-xs text-slate-500">{t("hotels.opensAt")}</p>
      </div>
    </div>
  );
}

export default HotelsSearch;