"use client";

import { Icon } from "@/components/icons";
import { getSampleTrip, type Trip } from "@/data/trip";
import { useI18n } from "@/i18n/provider";

type TimelineProps = {
  trip?: Trip;
  selectedDayId?: number | null;
  selectedActivityId?: number | null;
  onDaySelect?: (id: number) => void;
  onActivitySelect?: (id: number) => void;
  favorites?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  showFavoritesOnly?: boolean;
  onToggleShowFavoritesOnly?: () => void;
  onClearFavorites?: () => void;
};

export function Timeline({
  trip: tripData,
  selectedDayId,
  selectedActivityId,
  onDaySelect,
  onActivitySelect,
  favorites,
  onToggleFavorite,
  showFavoritesOnly = false,
  onToggleShowFavoritesOnly,
  onClearFavorites,
}: TimelineProps) {
  const { t, lang } = useI18n();
  const resolvedTrip = tripData ?? getSampleTrip(lang);
  const favoriteIds = favorites ?? new Set<number>();
  const favoritesCount = favoriteIds.size;
  const daysLabel =
    resolvedTrip.days.length === 1
      ? t("onboarding.dayOne")
      : t("onboarding.dayOther");
  const travelersLabel =
    resolvedTrip.travelers === 1
      ? t("onboarding.personOne")
      : t("onboarding.personOther");

  const visibleDays = showFavoritesOnly
    ? resolvedTrip.days
        .map((day) => ({
          ...day,
          activities: day.activities.filter((activity) =>
            favoriteIds.has(activity.id),
          ),
        }))
        .filter((day) => day.activities.length > 0)
    : resolvedTrip.days;

  const emptyFavorites = showFavoritesOnly && favoritesCount === 0;

  return (
    <section aria-labelledby="timeline-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="timeline-title"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            {t("timeline.title")}
          </h2>
          <p className="text-sm text-slate-500">
            {t("timeline.daysInfo", {
              days: resolvedTrip.days.length,
              daysLabel,
              travelers: resolvedTrip.travelers,
              travelersLabel,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleShowFavoritesOnly}
          aria-pressed={showFavoritesOnly}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            showFavoritesOnly
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-500"
          }`}
        >
          <Icon
            name="heart"
            className={`h-3.5 w-3.5 ${
              favoritesCount > 0 ? "fill-current text-rose-500" : ""
            }`}
          />
          <span>{t("timeline.favorites")}</span>
          <span className="tabular-nums">{favoritesCount}</span>
        </button>
      </div>

      {showFavoritesOnly ? (
        <p className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <span className="flex items-center gap-1.5">
            <Icon name="heart" className="h-3.5 w-3.5 fill-current" />
            {t("timeline.favoritesOnlyHint")}
          </span>
          {favoritesCount > 0 && (
            <button
              type="button"
              onClick={onClearFavorites}
              className="shrink-0 font-semibold underline underline-offset-2 transition hover:text-rose-900"
            >
              {t("timeline.clearFavorites")}
            </button>
          )}
        </p>
      ) : (
        <p className="mt-4 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          {t("timeline.hint")}
        </p>
      )}

      {emptyFavorites ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
            <Icon name="heart" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm text-slate-500">
            {t("timeline.favoritesEmpty")}
          </p>
          <button
            type="button"
            onClick={onToggleShowFavoritesOnly}
            className="mt-3 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            {t("timeline.showAll")}
          </button>
        </div>
      ) : (
        <ol className="mt-6 space-y-8">
          {visibleDays.map((day, index) => {
            const selected = day.id === selectedDayId;
            return (
              <li key={day.id} className="relative pl-9">
                {index < visibleDays.length - 1 && (
                  <span
                    className="absolute bottom-0 left-[13px] top-8 w-0.5 -translate-x-1/2 bg-gradient-to-b from-indigo-200 to-slate-200"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`absolute left-0 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-4 bg-white transition ${
                    selected ? "border-indigo-600" : "border-slate-300"
                  }`}
                  aria-hidden="true"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      selected ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  />
                </span>

                <button
                  type="button"
                  onClick={() => onDaySelect?.(day.id)}
                  aria-pressed={selected}
                  className={`group -mx-2 mb-3 flex w-[calc(100%+1rem)] items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${
                    selected ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-wide text-indigo-600">
                    {day.label}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {day.date}
                  </span>
                  <span
                    className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      selected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                    }`}
                  >
                    <Icon name="mapPin" className="h-3.5 w-3.5" />
                    {selected ? t("timeline.onMap") : t("timeline.viewOnMap")}
                  </span>
                </button>

                <ul className="space-y-3">
                  {day.activities.map((activity) => {
                    const activitySelected =
                      activity.id === selectedActivityId;
                    const isFavorite = favoriteIds.has(activity.id);
                    return (
                      <li key={activity.id}>
                        <div
                          className={`group relative w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                            activitySelected
                              ? "border-indigo-500 ring-2 ring-indigo-600/20"
                              : "border-slate-200 hover:border-indigo-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onActivitySelect?.(activity.id)}
                            aria-pressed={activitySelected}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                                <Icon
                                  name={activity.icon}
                                  className="h-4.5 w-4.5"
                                />
                              </span>
                               <div className="min-w-0 flex-1">
                                 <div className="flex items-start justify-between gap-2 pr-16">
                                   <h3 className="text-sm font-semibold text-slate-900">
                                     {activity.title}
                                   </h3>
                                 </div>
                                 <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                                   {activity.description}
                                 </p>
                                 {activity.lat != null && activity.lng != null && (
                                   <p className="mt-1 text-[11px] text-slate-400">
                                     📍 {activity.lat}, {activity.lng}
                                   </p>
                                 )}
                                 {(activity.duration || activity.cost || activity.openingHours) && (
                                   <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-slate-400">
                                     {activity.duration && <span>⏱ {activity.duration}</span>}
                                     {activity.cost && <span>💰 {activity.cost}</span>}
                                     {activity.openingHours && <span>🕒 {activity.openingHours}</span>}
                                   </div>
                                 )}
                                 {activity.link && (
                                   <p className="mt-1 text-[11px]">
                                     <a
                                       href={activity.link}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="text-indigo-600 underline"
                                     >
                                       🔗 {t("timeline.link")}
                                     </a>
                                   </p>
                                 )}
                                 {activity.phone && (
                                   <p className="mt-1 text-[11px] text-slate-400">📞 {activity.phone}</p>
                                 )}
                                 {activity.tip && (
                                   <p className="mt-1.5 text-[10px] text-amber-600">💡 {activity.tip}</p>
                                 )}
                                 <span
                                   className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                     activitySelected
                                       ? "bg-indigo-600 text-white"
                                       : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                                   }`}
                                 >
                                   <Icon name="mapPin" className="h-3 w-3" />
                                   {activitySelected
                                     ? t("timeline.onMap")
                                     : t("timeline.viewOnMap")}
                                 </span>
                               </div>
                            </div>
                          </button>
                          <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                            <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 tabular-nums">
                              {activity.time}
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggleFavorite?.(activity.id)}
                              aria-pressed={isFavorite}
                              aria-label={
                                isFavorite
                                  ? t("timeline.unfavorite")
                                  : t("timeline.favorite")
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                                isFavorite
                                  ? "bg-rose-50 text-rose-500"
                                  : "bg-slate-100 text-slate-300 hover:bg-rose-50 hover:text-rose-400"
                              }`}
                            >
                              <Icon
                                name="heart"
                                className={`h-4 w-4 ${
                                  isFavorite ? "fill-current" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
