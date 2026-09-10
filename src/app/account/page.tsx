"use client";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateTripPdf } from "@/lib/pdf";
import { mapTripResult } from "@/data/trip";
import { useI18n } from "@/i18n/provider";
import type { Roteiro, Checklist } from "@/types/itinerary";

type Sub = { id: string; planId: string; status: string; expiryAt: string; usedCount: number; maxItineraries: number };
type It = { id: string; destination: string; month: string; days: number; budget: string; lang: string; roteiro: Roteiro; pdfUrl?: string; createdAt: string };
type Check = { id: string; itineraryId?: string; items: unknown; lang: string; createdAt: string; itinerary?: { destination: string } };

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [its, setIts] = useState<It[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [planStatus, setPlanStatus] = useState<{ hasActivePlan?: boolean; remaining: number; max: number; planName: string; message: string } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/user/subscriptions?lang=${lang}`).then(r=>r.json()).then(d=>{
      // If DB says no plan but localStorage has a plan (immediate post-purchase before webhook), fallback to localStorage
      if (!d.status?.hasActivePlan) {
        try {
          const { getPlanStatus } = require("@/lib/plan-utils");
          const local = getPlanStatus(lang);
          if (local.hasActivePlan) { setSubs([]); setPlanStatus(local as never); return; }
        } catch {}
      }
      setSubs(d.subscriptions||[]); setPlanStatus(d.status);
    });
    fetch("/api/user/itineraries").then(r=>r.json()).then(setIts);
    fetch("/api/user/checklists").then(r=>r.json()).then(setChecks).catch(()=>{});
    const migrated = localStorage.getItem("rutawaynow-migrated");
    if (!migrated) {
      const plan = localStorage.getItem("rutawaynow-plan");
      const expiry = localStorage.getItem("rutawaynow-plan-expiry");
      const provider = localStorage.getItem("rutawaynow-plan-provider");
      const used = localStorage.getItem("rutawaynow-single-used");
      const legacyIts: unknown[] = [];
      try { const raw = localStorage.getItem("rutawaynow:lastItinerary"); if (raw) legacyIts.push(JSON.parse(raw)); } catch {}
      fetch("/api/user/migrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, expiry, provider, usedCount: used ? parseInt(used,10): undefined, itineraries: legacyIts }) }).then(()=> localStorage.setItem("rutawaynow-migrated","1"));
    }
  }, [status, lang]);

  const handlePdf = async (it: It) => {
    if (it.pdfUrl) { window.open(it.pdfUrl, "_blank"); return; }
    const trip = mapTripResult({ roteiro: it.roteiro, destination: it.destination, month: it.month, days: it.days, travelers: 1, budget: it.budget as never, styles: [], input: { destination: it.destination, days: it.days, month: it.month, budget: it.budget as never, adults: 1, teens: 0, children: 0, styles: [], lang: it.lang as never }, styleIds: [], monthIndex: -1 });
    generateTripPdf(trip, it.lang as never, { onboarding: { months: [] } } as never);
  };

  const handleChecklistPdf = async (check: Check) => {
    const relatedIt = its.find(i => i.id === check.itineraryId);
    if (relatedIt) { handlePdf(relatedIt); return; }
    // Generate PDF from checklist items (client-side)
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(String(t("checklist.title")), 14, 20);
    doc.setFontSize(10); doc.text(new Date(check.createdAt).toLocaleString(), 14, 28);
    let y = 36;
    const items = (check.items as { categorias?: Array<{ categoria: string; itens: string[] }> })?.categorias || [];
    for (const cat of items) {
      doc.setFontSize(12); doc.text(cat.categoria, 14, y); y+=7;
      doc.setFontSize(9);
      for (const it of cat.itens) { if (y>280) { doc.addPage(); y=14; } doc.text(`- ${it}`, 16, y); y+=5; }
      y+=3;
    }
    doc.save(`checklist-${check.id.slice(0,8)}.pdf`);
  };

  if (status === "loading") return <div className="p-8">{t("account.loading")}</div>;
  if (status === "unauthenticated") return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-2xl bg-white p-8 shadow max-w-md w-full text-center">
        <h1 className="text-xl font-bold">{t("account.userArea")}</h1>
        <p className="text-sm text-slate-600 mt-2">{t("account.loginHint")}</p>
        <button onClick={()=>signIn("google",{callbackUrl:"/account"})} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">{t("account.signInGoogle")}</button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("account.myAccount")} — {session?.user?.email}</h1>
          <button onClick={()=>signOut({callbackUrl:"/"})} className="text-sm text-slate-600">{t("account.signOut")}</button>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">{t("account.currentPlan")}</h2>
          {planStatus ? (
            planStatus.hasActivePlan ? (
              <p className="text-sm mt-2">{planStatus.message}</p>
            ) : (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-900">{planStatus.message}</p>
                <p className="text-xs text-amber-700 mt-1">{t("account.choosePlan")}</p>
                <Link href="/pricing" className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{t("account.viewPlans")}</Link>
              </div>
            )
          ) : <p className="text-sm text-slate-500">{t("account.loadingPlan")}</p>}
          {subs.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("account.subscriptionHistory")}</h3>
              {subs.map(s=> <div key={s.id} className="flex justify-between rounded-xl border p-3 text-sm"><span>{s.planId} — {s.status === 'active' ? t("account.active") : s.status} — {t("account.expires")} {new Date(s.expiryAt).toLocaleDateString()}</span><span>{s.usedCount}/{s.maxItineraries}</span></div>)}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("account.generated")} ({its.length})</h2>
            {its.length > 0 && <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">{t("account.newItinerary")}</Link>}
          </div>
          <div className="mt-4 grid gap-3">
            {its.length > 0 ? its.map(it=> (
              <div key={it.id} className="rounded-xl border p-4 flex items-center justify-between">
                <div><div className="font-medium">{it.destination} — {it.days} {t("account.days")} • {it.month}</div><div className="text-xs text-slate-500">{new Date(it.createdAt).toLocaleString()} • {it.lang === 'en' ? 'English' : 'Português'}</div></div>
                <div className="flex gap-2">
                  {it.pdfUrl ? <a href={it.pdfUrl} target="_blank" className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{t("account.downloadPdf")}</a> : <button onClick={()=>handlePdf(it)} className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{t("account.generatePdf")}</button>}
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm font-medium text-slate-900">{t("account.noItineraries")}</p>
                <p className="text-xs text-slate-500 mt-1">{t("account.noItinerariesHint")}</p>
                <Link href="/" className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{t("account.planTrip")}</Link>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("checklist.title")} ({checks.length})</h2>
            {checks.length > 0 && <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">{t("account.newItinerary")}</Link>}
          </div>
          <div className="mt-4 grid gap-3">
            {checks.length > 0 ? checks.map(ch=> (
              <div key={ch.id} className="rounded-xl border p-4 flex items-center justify-between">
                <div><div className="font-medium">{ch.itinerary?.destination || t("checklist.title")} — {new Date(ch.createdAt).toLocaleDateString()}</div><div className="text-xs text-slate-500">{ch.lang === 'en' ? 'English' : 'Português'} • {new Date(ch.createdAt).toLocaleString()}</div></div>
                <div className="flex gap-2">
                  <button onClick={()=>handleChecklistPdf(ch)} className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{t("account.downloadPdf")}</button>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm font-medium text-slate-900">{t("checklist.title")} — {t("account.noItineraries").toLowerCase()}</p>
                <p className="text-xs text-slate-500 mt-1">{t("account.noItinerariesHint")}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
