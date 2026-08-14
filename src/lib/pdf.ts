import { jsPDF } from "jspdf";
import type { Activity, Trip } from "@/data/trip";
import type { Checklist } from "@/types/itinerary";
import { pt, type Messages } from "@/i18n/pt";

const INDIGO: [number, number, number] = [79, 70, 229];
const INDIGO_LIGHT: [number, number, number] = [238, 242, 255];
const INDIGO_200: [number, number, number] = [199, 210, 254];
const SLATE: [number, number, number] = [51, 65, 85];
const MUTED: [number, number, number] = [100, 116, 139];
const FAINT: [number, number, number] = [226, 232, 240];

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 118;
const BOTTOM_MARGIN = 44;

type PdfStrings = Messages["pdf"];
type CategoryLabels = Record<string, string>;

function formatPdf(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (match, name: string) =>
      params[name] != null ? String(params[name]) : match,
  );
}

export function generateTripPdf(trip: Trip, strings?: PdfStrings): void {
  const s = strings ?? pt.pdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 0;
  let page = 1;

  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(s.tripFooter, MARGIN, PAGE_HEIGHT - 28);
    doc.text(formatPdf(s.page, { n: page }), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 28, {
      align: "right",
    });
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    page += 1;
    y = MARGIN;
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - BOTTOM_MARGIN) addPage();
  };

  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("RUTAWAYNOW", MARGIN, 30);

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(
    trip.title,
    CONTENT_WIDTH,
  ) as string[];
  doc.text(titleLines, MARGIN, 56);

  const subtitleOffset = 56 + titleLines.length * 26 + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INDIGO_200);
  doc.text(trip.subtitle, MARGIN, subtitleOffset);

  y = HEADER_HEIGHT + 26;

  const summaryParts = [
    trip.dates,
    trip.travelers === 1
      ? s.travelersOne
      : formatPdf(s.travelersOther, { n: trip.travelers }),
  ];
  if (trip.budget) summaryParts.push(trip.budget);
  if (trip.rating > 0)
    summaryParts.push(formatPdf(s.rating, { value: trip.rating }));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO);
  doc.text(summaryParts.join("   ·   "), MARGIN, y);
  y += 14;

  doc.setDrawColor(...FAINT);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 22;

  const drawActivity = (activity: Activity) => {
    const timeWidth = 58;
    const textMax = CONTENT_WIDTH - timeWidth - 12;
    const descLines = doc.splitTextToSize(
      activity.description,
      textMax,
    ) as string[];
    const titleLines = doc.splitTextToSize(activity.title, textMax) as string[];

    const extraLines: string[] = [];
    if (activity.duration) extraLines.push(`⏱ ${activity.duration}`);
    if (activity.cost) extraLines.push(`💰 ${activity.cost}`);
    if (activity.openingHours) extraLines.push(`🕒 ${activity.openingHours}`);
    if (activity.tip) extraLines.push(`💡 ${activity.tip}`);
    if (activity.lat != null && activity.lng != null) {
      extraLines.push(`📍 ${activity.lat}, ${activity.lng}`);
    }

    const extraHeight = extraLines.length > 0
      ? extraLines.length * 11 + 8
      : 0;

    const rowHeight = 16 + Math.max(descLines.length, titleLines.length) * 12 + 12 + extraHeight;

    ensureSpace(rowHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INDIGO);
    doc.text(activity.time, MARGIN, y + 2, { baseline: "top" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...SLATE);
    doc.text(titleLines, MARGIN + timeWidth + 12, y, { baseline: "top" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(descLines, MARGIN + timeWidth + 12, y + 15, { baseline: "top" });

    if (extraLines.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(...INDIGO);
      doc.text(extraLines, MARGIN + timeWidth + 12, y + 18 + Math.max(descLines.length, titleLines.length) * 12, {
        baseline: "top",
      });
    }

    y += rowHeight;
  };

  trip.days.forEach((day) => {
    ensureSpace(46);

    doc.setFillColor(...INDIGO_LIGHT);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 30, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INDIGO);
    doc.text(day.label.toUpperCase(), MARGIN + 14, y + 8, { baseline: "top" });

    doc.setFontSize(11);
    doc.setTextColor(...SLATE);
    doc.text(day.date, PAGE_WIDTH - MARGIN - 14, y + 8, {
      align: "right",
      baseline: "top",
    });
    y += 30 + 14;

    day.activities.forEach(drawActivity);
  });

  drawFooter();

  const safeName =
    trip.title.replace(/[^\p{L}\p{N}]+/gu, " ").trim() || s.fileTrip;
  doc.save(`RutawayNow - ${safeName}.pdf`);
}

export function generateChecklistPdf(
  checklist: Checklist,
  checkedByCategory?: number[][],
  strings?: PdfStrings,
  categoryLabels?: CategoryLabels,
): void {
  const s = strings ?? pt.pdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 0;
  let page = 1;

  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(s.checklistFooter, MARGIN, PAGE_HEIGHT - 28);
    doc.text(formatPdf(s.page, { n: page }), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 28, {
      align: "right",
    });
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    page += 1;
    y = MARGIN;
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - BOTTOM_MARGIN) addPage();
  };

  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("RUTAWAYNOW", MARGIN, 30);

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(s.checklistHeader, MARGIN, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INDIGO_200);
  const subtitleLines = doc.splitTextToSize(
    `${checklist.destino} · ${checklist.periodo}`,
    CONTENT_WIDTH,
  ) as string[];
  doc.text(subtitleLines, MARGIN, 84);

  y = HEADER_HEIGHT + 26;

  doc.setDrawColor(...FAINT);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 22;

  checklist.categorias.forEach((categoria, categoriaIndex) => {
    ensureSpace(36);

    doc.setFillColor(...INDIGO_LIGHT);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INDIGO);
    doc.text(
      (categoryLabels?.[categoria.categoria] ?? categoria.categoria).toUpperCase(),
      MARGIN + 14,
      y + 7,
      {
        baseline: "top",
      },
    );
    y += 28 + 14;

    categoria.itens.forEach((item, itemIndex) => {
      const isChecked =
        checkedByCategory?.[categoriaIndex]?.includes(itemIndex) ?? false;
      const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 30) as string[];
      const itemHeight = 18 + lines.length * 12;

      ensureSpace(itemHeight);

      if (isChecked) {
        doc.setFillColor(...INDIGO);
        doc.setDrawColor(...INDIGO);
        doc.setLineWidth(1);
        doc.roundedRect(MARGIN, y, 12, 12, 2, 2, "FD");

        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1.6);
        doc.line(MARGIN + 2.5, y + 6, MARGIN + 5, y + 8.5);
        doc.line(MARGIN + 5, y + 8.5, MARGIN + 9.5, y + 3.5);
      } else {
        doc.setDrawColor(...INDIGO_200);
        doc.setLineWidth(1);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(MARGIN, y, 12, 12, 2, 2, "FD");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...(isChecked ? MUTED : SLATE));
      doc.text(lines, MARGIN + 24, y, { baseline: "top" });

      y += itemHeight;
    });
  });

  drawFooter();

  const safeName =
    `${checklist.destino} ${checklist.periodo}`
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim() || s.fileChecklist;
  doc.save(`RutawayNow - ${s.fileChecklist} - ${safeName}.pdf`);
}
