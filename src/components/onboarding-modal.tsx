"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { mapTripResult } from "@/data/trip";
import { generateTripPdf } from "@/lib/pdf";
import { useI18n } from "@/i18n/provider";
import type {
  BudgetLevel,
  GerarRoteiroInput,
  Roteiro,
  TripResult,
} from "@/types/itinerary";
import { getPlanStatus, incrementUsage } from "@/lib/plan-utils";

const TOTAL_STEPS = 4;

type StyleOption = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
};

type BudgetOption = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
};

const MAX_DAYS = 30;
const MIN_DAYS = 1;
const MAX_TRAVELERS = 20;

const STYLE_ICONS: Record<string, IconName> = {
  aventura: "mountain",
  gastronomia: "food",
  cultura: "flags",
  natureza_praia: "umbrella",
  natureza_campo: "tree",
};

const BUDGET_ICONS: Record<string, IconName> = {
  baixo: "wallet",
  medio: "wallet",
  alto: "wallet",
};

type StepperRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

function StepperRow({ label, value, min, max, onChange }: StepperRowProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("common.reduce", { label })}
          disabled={value <= min}
          onClick={() => onChange(Math.max(value - 1, min))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="minus" className="h-4 w-4" />
        </button>
        <span className="w-9 text-center text-xl font-bold tabular-nums text-slate-900">
          {value}
        </span>
        <button
          type="button"
          aria-label={t("common.increase", { label })}
          disabled={value >= max}
          onClick={() => onChange(Math.min(value + 1, max))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type OnboardingModalProps = {
  onClose: () => void;
  onGenerated?: (result: TripResult) => void;
};

export function OnboardingModal({
  onClose,
  onGenerated,
}: OnboardingModalProps) {
  const { t, lang, messages } = useI18n();
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [month, setMonth] = useState<string | null>(null);
  const [days, setDays] = useState(5);
  const [adults, setAdults] = useState(2);
  const [teens, setTeens] = useState(0);
  const [children, setChildren] = useState(0);
  const [budget, setBudget] = useState<string | null>(null);
  const [styles, setStyles] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [itinerary, setItinerary] = useState<Roteiro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const styleOptions: StyleOption[] = Object.entries(
    messages.onboarding.styleOptions,
  ).map(([id, option]) => ({
    id,
    label: option.label,
    description: option.description,
    icon: STYLE_ICONS[id] ?? "mapPin",
  }));

  const itineraryCategoryLabels: Record<string, string> =
    messages.itinerary.categories;

  const budgetOptions: BudgetOption[] = Object.entries(
    messages.onboarding.budgetOptions,
  ).map(([id, option]) => ({
    id,
    label: option.label,
    description: option.description,
    icon: BUDGET_ICONS[id] ?? "wallet",
  }));

  const months = messages.onboarding.months;
  const popularDestinations = messages.onboarding.popularDestinationsList;

  const canContinue =
    step === 1
      ? destination.trim().length > 0
      : step === 2
        ? month !== null
        : step === 3
          ? budget !== null
          : true;
  const planStatus = getPlanStatus();
  const canGenerate = styles.length > 0 && planStatus.canGenerate;
  const totalTravelers = adults + teens + children;

  const daysLabel = days === 1 ? t("onboarding.dayOne") : t("onboarding.dayOther");
  const personsLabel =
    totalTravelers === 1
      ? t("onboarding.personOne")
      : t("onboarding.personOther");

  useEffect(() => {
    if (step === 1) inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step, done]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [generating, onClose]);

  const toggleStyle = (id: string) => {
    setStyles((current) =>
      current.includes(id)
        ? current.filter((style) => style !== id)
        : [...current, id],
    );
  };

  const buildInput = (): GerarRoteiroInput => ({
    destination: destination.trim(),
    days,
    month: month ?? "",
    budget: (budget ?? "medio") as BudgetLevel,
    adults,
    teens,
    children,
    styles: styles.map(
      (id) => styleOptions.find((style) => style.id === id)?.label ?? id,
    ),
    lang,
  });

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;

    // Check plan status before generating
    const planStatus = getPlanStatus();
    if (!planStatus.canGenerate) {
      setError(planStatus.message || t("errors.generateRoteiro"));
      return;
    }

    setError(null);
    setGenerating(true);

    try {
      const input = buildInput();
      const plan = localStorage.getItem('rutawaynow-plan');
      const planExpiry = localStorage.getItem('rutawaynow-plan-expiry');

      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: {
          "Authorization": "Bearer ${process.env.FREEAI_API_KEY}",
          "Content-Type": "application/json"},
        body: JSON.stringify({
          ...input,
          plan: localStorage.getItem('rutawaynow-plan'),
          planExpiry: localStorage.getItem('rutawaynow-plan-expiry'),
        }),
      });

      const data = (await response.json()) as Roteiro & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? t("errors.generateRoteiro"));
      }

      setItinerary(data);
      setDone(true);
      
      // Increment usage after successful generation
      const planStatus = getPlanStatus();
      if (planStatus.hasActivePlan && planStatus.planType) {
        incrementUsage(planStatus.planType);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.unexpectedRoteiro"),
      );
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setStep(1);
    setDestination("");
    setMonth(null);
    setDays(5);
    setAdults(2);
    setTeens(0);
    setChildren(0);
    setBudget(null);
    setStyles([]);
    setGenerating(false);
    setDone(false);
    setItinerary(null);
    setError(null);
  };

  const styleLabel = (id: string) =>
    styleOptions.find((style) => style.id === id)?.label;

  const budgetLabel = (id: string) =>
    budgetOptions.find((option) => option.id === id)?.label;

  const handleDownloadPdf = () => {
    if (!itinerary) return;
    generateTripPdf(
      mapTripResult({
        roteiro: itinerary,
        destination: destination.trim(),
        month: month ?? "",
        days,
        travelers: totalTravelers,
        budget: (budget ?? "medio") as BudgetLevel,
        styles: styles.map(
          (id) =>
            styleOptions.find((style) => style.id === id)?.label ?? id,
        ),
        input: buildInput(),
        styleIds: [...styles],
        monthIndex: month ? months.indexOf(month) : -1,
      }),
      lang,
      messages,
    );
    setPdfDownloaded(true);
    window.setTimeout(() => setPdfDownloaded(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="absolute inset-0 animate-overlay-in"
        aria-hidden="true"
        onClick={generating ? undefined : onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-lg animate-modal-in flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-3xl">
        <div className="flex items-center justify-between px-6 pb-0 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Icon name="plane" className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              RutawayNow
            </span>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            disabled={generating}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-4"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>
              {t("onboarding.stepOf", {
                current: done ? TOTAL_STEPS : step,
                total: TOTAL_STEPS,
              })}
            </span>
            <span className="tabular-nums">
              {done
                ? "100%"
                : `${Math.round((step / TOTAL_STEPS) * 100)}%`}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{
                width: done
                  ? "100%"
                  : `${(step / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>

          {done ? (
            <div className="animate-fade-up pt-6">
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Icon name="check" className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                  {t("onboarding.generatedTitle")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {destination.trim()} · {month} · {days} {daysLabel} ·{" "}
                  {budget && budgetLabel(budget)} · {totalTravelers}{" "}
                  {personsLabel} · {styles.map(styleLabel).join(", ")}
                </p>
              </div>


              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfDownloaded}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {pdfDownloaded ? (
                    <>
                      <Icon name="check" className="h-4 w-4" />
                      {t("common.downloaded")}
                    </>
                  ) : (
                    <>
                      <Icon name="download" className="h-4 w-4" />
                      {t("common.downloadPdf")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (itinerary && onGenerated) {
                      onGenerated({
                        roteiro: itinerary,
                        destination: destination.trim(),
                        month: month ?? "",
                        days,
                        travelers: totalTravelers,
                        budget: (budget ?? "medio") as BudgetLevel,
                        styles: styles.map(
                          (id) =>
                            styleOptions.find((style) => style.id === id)
                              ?.label ?? id,
                        ),
                        input: buildInput(),
                        styleIds: [...styles],
                        monthIndex: month ? months.indexOf(month) : -1,
                      });
                    }
                    onClose();
                    setTimeout(reset, 900);
                  }}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700"
                >
                  {t("onboarding.startExploring")}
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-5">
              {step === 1 && (
                <div className="animate-fade-up">
                  <label
                    htmlFor="destination"
                    className="text-lg font-bold tracking-tight text-slate-900"
                  >
                    {t("onboarding.destinationTitle")}
                  </label>
                  <div className="relative mt-3">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon name="search" className="h-5 w-5" />
                    </span>
                    <input
                      id="destination"
                      ref={inputRef}
                      type="text"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && canContinue) {
                          event.preventDefault();
                          setStep(2);
                        }
                      }}
                      placeholder={t("onboarding.destinationPlaceholder")}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t("onboarding.popularDestinations")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {popularDestinations.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setDestination(name)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                          destination === name
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    {t("onboarding.destinationHint")}
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-up">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    {t("onboarding.monthTitle")}
                  </h2>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {months.map((name) => {
                      const selected = month === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setMonth(name)}
                          className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20"
                              : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("onboarding.daysTitle")}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("onboarding.daysHint")}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      aria-label={t("common.reduce", {
                        label:
                          days === 1
                            ? t("onboarding.dayOne")
                            : t("onboarding.dayOther"),
                      })}
                      disabled={days <= MIN_DAYS}
                      onClick={() =>
                        setDays((d) => Math.max(d - 1, MIN_DAYS))
                      }
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon name="minus" className="h-5 w-5" />
                    </button>
                    <div className="w-20 text-center">
                      <span className="text-4xl font-bold tabular-nums text-slate-900">
                        {days}
                      </span>
                      <span className="block text-xs font-medium text-slate-400">
                        {daysLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={t("common.increase", {
                        label:
                          days === 1
                            ? t("onboarding.dayOne")
                            : t("onboarding.dayOther"),
                      })}
                      disabled={days >= MAX_DAYS}
                      onClick={() =>
                        setDays((d) => Math.min(d + 1, MAX_DAYS))
                      }
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon name="plus" className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <p className="text-sm font-bold text-slate-900">
                      {t("onboarding.travelersTitle")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t("onboarding.totalTravelers", {
                        count: totalTravelers,
                        label: personsLabel,
                      })}
                    </p>
                    <div className="mt-4 space-y-4">
                      <StepperRow
                        label={t("onboarding.adults")}
                        value={adults}
                        min={1}
                        max={MAX_TRAVELERS}
                        onChange={setAdults}
                      />
                      <StepperRow
                        label={t("onboarding.teens")}
                        value={teens}
                        min={0}
                        max={MAX_TRAVELERS}
                        onChange={setTeens}
                      />
                      <StepperRow
                        label={t("onboarding.children")}
                        value={children}
                        min={0}
                        max={MAX_TRAVELERS}
                        onChange={setChildren}
                      />
                    </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-fade-up">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    {t("onboarding.budgetTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("onboarding.budgetHint")}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {budgetOptions.map((option) => {
                      const selected = budget === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setBudget(option.id)}
                          className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/30"
                              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                              selected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon name={option.icon} className="h-5 w-5" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-slate-900">
                              {option.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {option.description}
                            </span>
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            <Icon name="check" className="h-3 w-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="animate-fade-up">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    {t("onboarding.styleTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("onboarding.styleHint")}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {styleOptions.map((style) => {
                      const selected = styles.includes(style.id);
                      return (
                        <button
                          key={style.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleStyle(style.id)}
                          className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/30"
                              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                              selected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon name={style.icon} className="h-5 w-5" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-slate-900">
                              {style.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {style.description}
                            </span>
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            <Icon name="check" className="h-3 w-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!done && (
            <div className="mt-8">
              {error && (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => setStep((s) => s - 1)}
                    className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Icon name="chevronLeft" className="h-4 w-4" />
                    {t("onboarding.back")}
                  </button>
                )}
                {step < TOTAL_STEPS ? (
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => setStep((s) => s + 1)}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {t("onboarding.continue")}
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canGenerate || generating}
                    onClick={handleGenerate}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {generating ? (
                      <>
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          aria-hidden="true"
                        />
                        {t("onboarding.generatingRoteiro")}
                      </>
                    ) : (
                      <>
                        <Icon name="sparkles" className="h-4 w-4" />
                        {t("onboarding.generateMagic")}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
