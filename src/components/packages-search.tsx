"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Icon } from "@/components/icons";
import { AirportSelect } from "@/components/airport-select";
import { resolveAirport } from "@/lib/flights/airports";
import { findDestinations } from "@/lib/travel/destinations";
import { buildTripPackagesSearchUrl, CABIN_OPTIONS } from "@/lib/flights/trip";

function todayInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function PackagesSearch() {
  const { t, lang } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [cabin, setCabin] = useState("economy");
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
      setError(t("packages.fromRequired"));
      return;
    }
    if (!toText) {
      setError(t("packages.toRequired"));
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
      setError(t("packages.dateRequired"));
      return;
    }
    if (!returnDate) {
      setError(t("packages.returnDateRequired"));
      return;
    }
    if (returnDate < departDate) {
      setError(t("flights.returnAfterDeparture"));
      return;
    }

    const destination = findDestinations(
      toAirport.city,
      5,
    ).find((candidate) => candidate.cityEn === toAirport.cityEn);

    const url = buildTripPackagesSearchUrl({
      origin: fromAirport.code,
      destination: toAirport.code,
      destinationName: toAirport.cityEn ?? toAirport.city,
      tripCityId: destination?.tripCityId ?? null,
      departDate,
      returnDate,
      adults,
      children,
      rooms,
      isOversea: fromAirport.country !== toAirport.country,
      classType: CABIN_OPTIONS.find((option) => option.value === cabin)?.packagesClassType ?? "ys",
      lang,
    });
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          {t("packages.title")}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Icon name="planeHotel" className="h-3.5 w-3.5" />
          {t("carousel.hotels")} + {t("carousel.flights")}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("packages.fromLabel")}
          </label>
          <AirportSelect
            label={t("packages.fromLabel")}
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
            {t("packages.toLabel")}
          </label>
          <AirportSelect
            label={t("packages.toLabel")}
            value={to}
            placeholder={t("flights.searchPlaceholder")}
            noResults={t("flights.noResults")}
            locale={lang}
            onChange={setTo}
          />
          {to &&
            resolveAirport(to) &&
            from &&
            resolveAirport(from) &&
            resolveAirport(from)!.country !== resolveAirport(to)!.country && (
              <p className="mt-1 text-xs text-slate-500">{t("packages.oversea")}</p>
            )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("packages.departureDate")}
            </label>
            <input
              type="date"
              value={departDate}
              min={minDate}
              onChange={(event) => setDepartDate(event.target.value)}
              aria-label={t("packages.departureDate")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("packages.returnDate")}
            </label>
            <input
              type="date"
              value={returnDate}
              min={departDate || minDate}
              onChange={(event) => setReturnDate(event.target.value)}
              aria-label={t("packages.returnDate")}
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

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("flights.cabin")}
          </label>
          <select
            value={cabin}
            onChange={(event) => setCabin(event.target.value)}
            aria-label={t("flights.cabin")}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CABIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`flights.cabins.${option.labelKey}`)}
              </option>
            ))}
          </select>
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
          {t("packages.search")}
        </button>

        <p className="text-center text-xs text-slate-500">{t("packages.opensAt")}</p>
      </div>
    </div>
  );
}

export default PackagesSearch;