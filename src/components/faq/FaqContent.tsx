"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export function FaqContent() {
  const { messages, t } = useI18n();
  const faq = messages.faq;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <span aria-hidden="true">←</span> {t("faq.back")}
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("faq.title")}
        </h1>
        <p className="mt-2 text-slate-600">{t("faq.subtitle")}</p>

        {faq.sections.map((section) => (
          <section key={section.id} className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.items.map((item, index) => (
                <details
                  key={index}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 open:bg-white open:shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-lg leading-none text-slate-400 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}