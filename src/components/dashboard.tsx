"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { ChecklistModal } from "@/components/checklist-modal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Onboarding } from "@/components/onboarding";
import { Timeline } from "@/components/timeline";
import { TripMap } from "@/components/trip-map";
import { getSampleTrip, mapTripResult } from "@/data/trip";
import { generateTripPdf } from "@/lib/pdf";
import { useI18n } from "@/i18n/provider";
import { LANGUAGES } from "@/i18n/languages";
import type {
  Checklist,
  Roteiro,
  TripResult,
} from "@/types/itinerary";

const FAVORITES_KEY = "rutawaynow-favorites";

function loadFavorites(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, number[]>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function Dashboard() {
  const { t, lang, messages } = useI18n();
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    null,
  );
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [checklistLang, setChecklistLang] = useState<"pt" | "en" | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isTranslatingChecklist, setIsTranslatingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<
    Set<string>
  >(new Set());
  const [roteiroDownloaded, setRoteiroDownloaded] = useState(false);
  const [favoritesByTrip, setFavoritesByTrip] = useState<
    Record<string, number[]>
  >(loadFavorites);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [generatedLang, setGeneratedLang] = useState<"pt" | "en" | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const activeTrip = useMemo(
    () => (tripResult ? mapTripResult(tripResult, lang, messages) : getSampleTrip(lang)),
    [tripResult, lang, messages],
  );

  const tripKey = activeTrip.title;
  const favorites = useMemo(
    () => new Set(favoritesByTrip[tripKey] ?? []),
    [favoritesByTrip, tripKey],
  );

  const effectiveDay =
    selectedDayId != null
      ? activeTrip.days.find((day) => day.id === selectedDayId) ?? null
      : null;
  const effectiveDayId = effectiveDay?.id ?? activeTrip.days[0]?.id ?? null;
  const effectiveActivityId =
    effectiveDayId != null &&
    selectedActivityId != null &&
    activeTrip.days
      .find((day) => day.id === effectiveDayId)
      ?.activities.some((activity) => activity.id === selectedActivityId)
      ? selectedActivityId
      : null;

  const applyTripResult = (result: TripResult) => {
    setTripResult(result);
    setGeneratedLang(result.input.lang);
    setSelectedDayId(result.roteiro.dias[0]?.dia ?? null);
    setSelectedActivityId(null);
    setChecklistOpen(false);
    setShowFavoritesOnly(false);
  };

  const handleGenerated = (result: TripResult) => {
    setChecklist(null);
    setChecklistLang(null);
    setChecklistError(null);
    setCheckedChecklistItems(new Set());
    applyTripResult(result);
  };

  const handleTranslate = async () => {
    const current = tripResult;
    if (!current || isRegenerating) return;

    setRegenerateError(null);
    setIsRegenerating(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roteiro: current.roteiro, lang }),
      });

      const data = (await response.json()) as (Roteiro & { error?: string }) | null;

      if (!response.ok || !data) {
        throw new Error(
          data?.error ?? t("errors.generateRoteiro"),
        );
      }

      applyTripResult({
        ...current,
        roteiro: data,
        input: { ...current.input, lang },
      });
    } catch (err) {
      setRegenerateError(
        err instanceof Error ? err.message : t("errors.generateRoteiro"),
      );
    } finally {
      setIsRegenerating(false);
    }
   };

  useEffect(() => {
    if (tripResult && generatedLang && generatedLang !== lang) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const languageLabel = (code: string) =>
    LANGUAGES.find((option) => option.code === code)?.label ?? code;

  const handleToggleFavorite = (id: number) => {
    setFavoritesByTrip((current) => {
      const list = current[tripKey] ?? [];
      const next = new Set(list);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const updated = { ...current, [tripKey]: Array.from(next) };
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearFavorites = () => {
    setFavoritesByTrip((current) => {
      const updated = { ...current, [tripKey]: [] };
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDaySelect = (id: number) => {
    setSelectedDayId(id);
    setSelectedActivityId(null);
  };

  const handleActivitySelect = (id: number) => {
    const day = activeTrip.days.find((item) =>
      item.activities.some((activity) => activity.id === id),
    );
    if (day) setSelectedDayId(day.id);
    setSelectedActivityId(id);
  };

  const destinationLabel = tripResult?.destination ?? "Florianópolis · SC";

  const handleDownloadPdf = () => {
    generateTripPdf(activeTrip, messages.pdf);
    setRoteiroDownloaded(true);
    window.setTimeout(() => setRoteiroDownloaded(false), 2500);
  };

  const handleToggleChecklistItem = (key: string) => {
    setCheckedChecklistItems((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerateChecklist = async () => {
    if (isGeneratingChecklist) return;

    if (checklist && checklistLang && checklistLang !== lang) {
      void handleTranslateChecklist();
      return;
    }

    if (checklist && checklistLang === lang) {
      setChecklistOpen(true);
      return;
    }

    const months = messages.onboarding.months as string[];
    const translatedMonth =
      tripResult && tripResult.monthIndex >= 0 && tripResult.monthIndex < months.length
        ? months[tripResult.monthIndex]
        : tripResult?.month ?? activeTrip.dates;

    const checklistSource = tripResult
      ? {
          destination: tripResult.destination,
          month: translatedMonth,
          lang,
        }
      : {
          destination: activeTrip.title,
          month: activeTrip.dates,
          lang,
        };

    setChecklistError(null);
    setIsGeneratingChecklist(true);

    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checklistSource),
      });

      const data = (await response.json()) as Checklist & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? t("errors.generateChecklist"));
      }

      setCheckedChecklistItems(
        (current) =>
          new Set(
            [...current].filter((key) =>
              data.categorias.some((categoria) =>
                categoria.itens.some(
                  (item) => `${categoria.categoria}::${item}` === key,
                ),
              ),
            ),
          ),
      );
      setChecklist(data);
      setChecklistLang(lang);
      setChecklistOpen(true);
    } catch (err) {
      setChecklistError(
        err instanceof Error ? err.message : t("errors.generateChecklist"),
      );
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const handleTranslateChecklist = async () => {
    const current = checklist;
    if (!current || isTranslatingChecklist) return;

    setChecklistError(null);
    setIsTranslatingChecklist(true);

    // Preserve checked state by position before translation
    const checkedByPosition: boolean[][] = current.categorias.map((categoria) =>
      categoria.itens.map(() => false),
    );
    current.categorias.forEach((categoria, catIdx) => {
      categoria.itens.forEach((item, itemIdx) => {
        if (checkedChecklistItems.has(`${categoria.categoria}::${item}`)) {
          checkedByPosition[catIdx][itemIdx] = true;
        }
      });
    });

    try {
      const response = await fetch("/api/translate-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: current, lang }),
      });

      const data = (await response.json()) as (Checklist & { error?: string }) | null;

      if (!response.ok || !data) {
        throw new Error(
          data?.error ?? t("errors.generateChecklist"),
        );
      }

      // Rebuild checked items set from positions with new translated text
      const newChecked = new Set<string>();
      data.categorias.forEach((categoria, catIdx) => {
        categoria.itens.forEach((item, itemIdx) => {
          if (checkedByPosition[catIdx]?.[itemIdx]) {
            newChecked.add(`${categoria.categoria}::${item}`);
          }
        });
      });

      setChecklist(data);
      setChecklistLang(lang);
      setCheckedChecklistItems(newChecked);
    } catch (err) {
      setChecklistError(
        err instanceof Error ? err.message : t("errors.generateChecklist"),
      );
    } finally {
      setIsTranslatingChecklist(false);
    }
  };

  useEffect(() => {
    if (checklist && checklistLang && checklistLang !== lang) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void handleTranslateChecklist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Icon name="plane" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">
              RutawayNow
            </p>
            <p className="text-xs text-slate-500">{t("app.tagline")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Onboarding onGenerated={handleGenerated} />
          <LanguageSwitcher />
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
          >
            <Icon name="users" className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.invite")}</span>
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white">
            MC
          </span>
        </div>
      </header>

      {tripResult && generatedLang && generatedLang !== lang && (
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-indigo-200 bg-indigo-50 p-4 gap-3">
          <p className="text-sm font-semibold text-indigo-900 flex-1">
            {t("dashboard.translatingTitle", {
              from: languageLabel(generatedLang),
              to: languageLabel(lang),
            })}
          </p>
          {isRegenerating ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400/40 border-t-indigo-600"
                aria-hidden="true"
              />
              {t("common.generating")}
            </span>
          ) : null}
          {regenerateError && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-rose-600">
              <Icon name="close" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {regenerateError}
            </p>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                <Icon name="sparkles" className="h-3.5 w-3.5" />
                {tripResult ? t("dashboard.generated") : t("dashboard.planning")}
              </span>
              {activeTrip.rating > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <Icon name="star" className="h-3.5 w-3.5 text-amber-500" />
                  {activeTrip.rating}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {activeTrip.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{activeTrip.subtitle}</p>
          </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                  {activeTrip.dates}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="users" className="h-4 w-4 text-slate-400" />
                  {activeTrip.travelers}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={roteiroDownloaded}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {roteiroDownloaded ? (
                    <>
                      <Icon name="check" className="h-4 w-4" />
                      {t("common.downloaded")}
                    </>
                  ) : (
                    <>
                      <Icon name="download" className="h-4 w-4" />
                      {t("common.downloadRoteiro")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateChecklist}
                  disabled={isGeneratingChecklist}
                  title={t("dashboard.checklistTooltip")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {isGeneratingChecklist ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                      {t("common.generating")}
                    </>
                  ) : (
                    <>
                      <Icon name="list" className="h-4 w-4" />
                      {t("dashboard.checklist")}
                    </>
                  )}
                </button>
              </div>
              {checklistError && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-600">
                  <Icon name="close" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {checklistError}
                </p>
              )}
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          <div className="order-2 lg:order-1 lg:col-span-1">
            <Timeline
              trip={activeTrip}
              selectedDayId={effectiveDayId}
              selectedActivityId={effectiveActivityId}
              onDaySelect={handleDaySelect}
              onActivitySelect={handleActivitySelect}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              showFavoritesOnly={showFavoritesOnly}
              onToggleShowFavoritesOnly={() =>
                setShowFavoritesOnly((value) => !value)
              }
              onClearFavorites={handleClearFavorites}
            />
          </div>
          <div className="order-1 lg:sticky lg:top-6 lg:order-2 lg:col-span-2">
            <TripMap
              trip={activeTrip}
              destination={destinationLabel}
              selectedDayId={effectiveDayId}
              selectedActivityId={effectiveActivityId}
            />
          </div>
        </div>
      </div>

      <footer className="pt-6 text-center text-xs text-slate-400">
        RutawayNow © 2026 · {t("app.footer")}
      </footer>

      {checklist && checklistOpen && (
        <ChecklistModal
          checklist={checklist}
          checkedItems={checkedChecklistItems}
          onToggleItem={handleToggleChecklistItem}
          onClose={() => setChecklistOpen(false)}
        />
      )}
    </div>
  );
}
