"use client";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateTripPdf } from "@/lib/pdf";
import { mapTripResult } from "@/data/trip";
import type { Roteiro } from "@/types/itinerary";

type Sub = { id: string; planId: string; status: string; expiryAt: string; usedCount: number; maxItineraries: number };
type It = { id: string; destination: string; month: string; days: number; budget: string; lang: string; roteiro: Roteiro; pdfUrl?: string; createdAt: string };

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [its, setIts] = useState<It[]>([]);
  const [planStatus, setPlanStatus] = useState<{ hasActivePlan?: boolean; remaining: number; max: number; planName: string; message: string } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/subscriptions").then(r=>r.json()).then(d=>{ setSubs(d.subscriptions||[]); setPlanStatus(d.status); });
    fetch("/api/user/itineraries").then(r=>r.json()).then(setIts);
    // migrate localStorage once
    const migrated = localStorage.getItem("rutawaynow-migrated");
    if (!migrated) {
      const plan = localStorage.getItem("rutawaynow-plan");
      const expiry = localStorage.getItem("rutawaynow-plan-expiry");
      const provider = localStorage.getItem("rutawaynow-plan-provider");
      const used = localStorage.getItem("rutawaynow-single-used");
      // collect itineraries from localStorage if any (legacy)
      const legacyIts: unknown[] = [];
      try { const raw = localStorage.getItem("rutawaynow:lastItinerary"); if (raw) legacyIts.push(JSON.parse(raw)); } catch {}
      fetch("/api/user/migrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, expiry, provider, usedCount: used ? parseInt(used,10): undefined, itineraries: legacyIts }) }).then(()=> localStorage.setItem("rutawaynow-migrated","1"));
    }
  }, [status]);

  const handlePdf = async (it: It) => {
    if (it.pdfUrl) { window.open(it.pdfUrl, "_blank"); return; }
    // regenerate PDF client-side and upload to blob
    const trip = mapTripResult({ roteiro: it.roteiro, destination: it.destination, month: it.month, days: it.days, travelers: 1, budget: it.budget as never, styles: [], input: { destination: it.destination, days: it.days, month: it.month, budget: it.budget as never, adults: 1, teens: 0, children: 0, styles: [], lang: it.lang as never }, styleIds: [], monthIndex: -1 });
    // generate pdf as base64 via jspdf - use existing helper that downloads; for blob we generate buffer
    // For now regenerate and download; also store blob
    // @ts-ignore
    const blob = await (async () => {
      // fallback: use generateTripPdf download, then fetch as blob upload
      // generate and capture via jspdf internals - simplified: download and also upload
      generateTripPdf(trip, it.lang as never, { onboarding: { months: [] } } as never);
      return null;
    })();
  };

  if (status === "loading") return <div className="p-8">Carregando...</div>;
  if (status === "unauthenticated") return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-2xl bg-white p-8 shadow max-w-md w-full text-center">
        <h1 className="text-xl font-bold">Área do usuário</h1>
        <p className="text-sm text-slate-600 mt-2">Faça login para ver seus planos e roteiros.</p>
        <button onClick={()=>signIn("google",{callbackUrl:"/account"})} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">Entrar com Google</button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Minha conta — {session?.user?.email}</h1>
          <button onClick={()=>signOut({callbackUrl:"/"})} className="text-sm text-slate-600">Sair</button>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">Plano atual</h2>
          {planStatus ? (
            planStatus.hasActivePlan ? (
              <>
                <p className="text-sm mt-2">{planStatus.message}</p>
                <p className="text-xs text-slate-500 mt-1">{planStatus.remaining} de {planStatus.max} roteiros disponíveis • Plano {planStatus.planName}</p>
              </>
            ) : (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-900">{planStatus.message}</p>
                <p className="text-xs text-amber-700 mt-1">Escolha um plano para começar a gerar roteiros personalizados.</p>
                <Link href="/pricing" className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Ver planos</Link>
              </div>
            )
          ) : <p className="text-sm text-slate-500">Carregando plano...</p>}
          {subs.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Histórico de assinaturas</h3>
              {subs.map(s=> <div key={s.id} className="flex justify-between rounded-xl border p-3 text-sm"><span>{s.planId} — {s.status === 'active' ? 'Ativo' : s.status} — expira {new Date(s.expiryAt).toLocaleDateString()}</span><span>{s.usedCount}/{s.maxItineraries}</span></div>)}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Roteiros gerados ({its.length})</h2>
            {its.length > 0 && <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">+ Novo roteiro</Link>}
          </div>
          <div className="mt-4 grid gap-3">
            {its.length > 0 ? its.map(it=> (
              <div key={it.id} className="rounded-xl border p-4 flex items-center justify-between">
                <div><div className="font-medium">{it.destination} — {it.days} dias • {it.month}</div><div className="text-xs text-slate-500">{new Date(it.createdAt).toLocaleString()} • {it.lang === 'en' ? 'English' : 'Português'}</div></div>
                <div className="flex gap-2">
                  {it.pdfUrl ? <a href={it.pdfUrl} target="_blank" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">Baixar PDF</a> : <button onClick={()=>handlePdf(it)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50">Gerar PDF</button>}
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm font-medium text-slate-900">Nenhum roteiro ainda</p>
                <p className="text-xs text-slate-500 mt-1">Gere seu primeiro roteiro personalizado em poucos passos.</p>
                <Link href="/" className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Planejar viagem</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
