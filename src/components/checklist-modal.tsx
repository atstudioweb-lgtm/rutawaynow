"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { generateChecklistPdf } from "@/lib/pdf";
import { useI18n } from "@/i18n/provider";
import type { Checklist } from "@/types/itinerary";

const CATEGORY_ICONS: Record<string, IconName> = {
  Documentos: "fileText",
  Documents: "fileText",
  Saúde: "firstAid",
  Health: "firstAid",
  Vestuário: "shirt",
  Clothing: "shirt",
  Orçamento: "wallet",
  Budget: "wallet",
};

const itemKey = (categoria: string, item: string) =>
  `${categoria}::${item}`;

type ChecklistModalProps = {
  checklist: Checklist;
  checkedItems: Set<string>;
  onToggleItem: (key: string) => void;
  onClose: () => void;
};

export function ChecklistModal({
  checklist,
  checkedItems,
  onToggleItem,
  onClose,
}: ChecklistModalProps) {
  const { t, messages } = useI18n();
  const categoryLabels: Record<string, string> = messages.checklist.categories;
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const handleDownload = () => {
    const checkedByCategory = checklist.categorias.map((categoria) =>
      categoria.itens
        .map((_, itemIndex) => itemIndex)
        .filter((_, itemIndex) =>
          checkedItems.has(itemKey(categoria.categoria, categoria.itens[itemIndex])),
        ),
    );
    generateChecklistPdf(checklist, checkedByCategory, messages.pdf, categoryLabels);
    setDownloaded(true);
    window.setTimeout(() => onClose(), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checklist-title"
    >
      <div
        className="absolute inset-0 animate-overlay-in"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-lg animate-modal-in flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 px-6 pb-0 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Icon name="list" className="h-4 w-4" />
            </span>
            <div>
              <h2
                id="checklist-title"
                className="text-sm font-bold tracking-tight text-slate-900"
              >
                {t("checklist.title")}
              </h2>
              <p className="text-xs text-slate-500">
                {checklist.destino} · {checklist.periodo}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
          <p className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            {t("checklist.hint")}
          </p>

          {checklist.categorias.map((categoria, categoriaIndex) => (
            <section key={`${categoria.categoria}-${categoriaIndex}`}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon
                    name={CATEGORY_ICONS[categoria.categoria] ?? "list"}
                    className="h-4 w-4"
                  />
                </span>
                {categoryLabels[categoria.categoria] ?? categoria.categoria}
              </h3>
              <ul className="mt-2.5 space-y-1.5">
                {categoria.itens.map((item) => {
                  const key = itemKey(categoria.categoria, item);
                  const isChecked = checkedItems.has(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        onClick={() => onToggleItem(key)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                          isChecked
                            ? "border-indigo-200 bg-indigo-50/60"
                            : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            isChecked
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 text-transparent"
                          }`}
                        >
                          <Icon name="check" className="h-3 w-3" />
                        </span>
                        <span
                          className={`text-sm leading-relaxed ${
                            isChecked
                              ? "text-slate-400 line-through"
                              : "text-slate-700"
                          }`}
                        >
                          {item}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={downloaded}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {t("checklist.conclude")}
            <Icon name="check" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloaded}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {downloaded ? (
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
        </div>
      </div>
    </div>
  );
}
