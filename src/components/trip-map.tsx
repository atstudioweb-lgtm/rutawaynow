"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { Trip } from "@/data/trip";
import { useI18n } from "@/i18n/provider";
import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

type TripMapProps = {
  trip: Trip;
  destination?: string;
  selectedDayId?: number | null;
  selectedActivityId?: number | null;
};

type RenderMap = (
  trip: Trip,
  selectedDayId: number | null | undefined,
  selectedActivityId: number | null | undefined,
) => void;

const FALLBACK_CENTER = { lat: -15.7939, lng: -47.8828 };
const FALLBACK_DESTINATION = "Florianópolis · SC";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function TripMap({
  trip,
  destination,
  selectedDayId,
  selectedActivityId,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const updateMapRef = useRef<RenderMap | null>(null);
  const latestPropsRef = useRef({ trip, selectedDayId, selectedActivityId });
  const { t } = useI18n();
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    latestPropsRef.current = { trip, selectedDayId, selectedActivityId };
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: LeafletMap | null = null;
    let layer: LayerGroup | null = null;

    (async () => {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;

      map = L.map(containerRef.current, { zoomControl: false }).setView(
        [FALLBACK_CENTER.lat, FALLBACK_CENTER.lng],
        4,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      map.on("zoomend", () => setZoom(map?.getZoom() ?? 12));
      layer = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layer;

      const pinIcon = (highlighted: boolean) =>
        L.divIcon({
          className: "",
          html: `<div style="width:${highlighted ? 28 : 20}px;height:${
            highlighted ? 28 : 20
          }px;background:${highlighted ? "#4f46e5" : "#334155"};border:3px solid #ffffff;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>`,
          iconSize: [highlighted ? 28 : 20, highlighted ? 28 : 20],
          iconAnchor: [14, 14],
        });

      const render: RenderMap = (
        currentTrip,
        currentSelectedDayId,
        currentSelectedActivityId,
      ) => {
        if (!map || !layer) return;
        const leafletMap = map;
        const leafletLayer = layer;
        leafletLayer.clearLayers();

        const days = currentTrip.days;
        const activeDay =
          currentSelectedDayId != null
            ? days.find((day) => day.id === currentSelectedDayId) ?? days[0]
            : days[0];
        const activities = activeDay?.activities ?? [];

        const highlightedActivity =
          currentSelectedActivityId != null
            ? activities.find(
                (activity) => activity.id === currentSelectedActivityId,
              )
            : undefined;
        const highlightedId =
          highlightedActivity?.id ??
          activities[0]?.id ??
          null;

        const points: { lat: number; lng: number }[] = [];

        activities.forEach((activity) => {
          if (activity.lat == null || activity.lng == null) return;
          points.push({ lat: activity.lat, lng: activity.lng });
          const marker = L.marker([activity.lat, activity.lng], {
            icon: pinIcon(activity.id === highlightedId),
          });
          marker.bindPopup(
            `<strong>${escapeHtml(activity.title)}</strong><br/><span style="color:#64748b">${activity.time} · ${escapeHtml(activity.description)}</span>`,
          );
          marker.addTo(leafletLayer);
        });

        if (highlightedActivity?.lat != null && highlightedActivity.lng != null) {
          leafletMap.setView(
            [highlightedActivity.lat, highlightedActivity.lng],
            14,
          );
        } else if (points.length > 0) {
          leafletMap.fitBounds(
            L.latLngBounds(
              points.map((point) => L.latLng(point.lat, point.lng)),
            ),
            { padding: [48, 48], maxZoom: 14 },
          );
        } else if (currentTrip.center) {
          leafletMap.setView(
            [currentTrip.center.lat, currentTrip.center.lng],
            12,
          );
        } else {
          leafletMap.setView([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng], 12);
        }
      };

      updateMapRef.current = render;
      render(
        latestPropsRef.current.trip,
        latestPropsRef.current.selectedDayId,
        latestPropsRef.current.selectedActivityId,
      );
    })();

    return () => {
      disposed = true;
      updateMapRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    updateMapRef.current?.(
      trip,
      selectedDayId,
      selectedActivityId,
    );
  }, [trip, selectedDayId, selectedActivityId]);

  const days = trip.days;
  const activeDay =
    selectedDayId != null
      ? days.find((day) => day.id === selectedDayId) ?? days[0]
      : days[0];
  const activities = activeDay?.activities ?? [];
  const highlightedActivity =
    selectedActivityId != null
      ? activities.find((activity) => activity.id === selectedActivityId)
      : undefined;
  const nextActivity = highlightedActivity ?? activities[0];
  const nextPoint = nextActivity
    ? `${nextActivity.title} · ${nextActivity.time}`
    : t("map.selectDay");

  return (
    <section
      aria-label={t("map.ariaLabel")}
      className="relative h-72 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm sm:h-96 lg:h-[calc(100vh-10rem)] lg:min-h-[560px]"
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur">
          <Icon name="mapPin" className="h-3.5 w-3.5 text-indigo-600" />
          {destination ?? FALLBACK_DESTINATION}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
        <div className="rounded-xl bg-white/95 px-3 py-2 shadow-sm ring-1 ring-slate-200 backdrop-blur">
          <p className="text-[11px] font-medium text-slate-400">
            {t("map.nextPoint")}
          </p>
          <p className="text-sm font-semibold text-slate-800">{nextPoint}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {t("map.trafficLight")}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <button
          type="button"
          aria-label={t("map.zoomIn")}
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
        <span className="border-y border-slate-100 text-center text-[11px] font-medium text-slate-400 tabular-nums">
          {zoom}
        </span>
        <button
          type="button"
          aria-label={t("map.zoomOut")}
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600"
        >
          <Icon name="minus" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
