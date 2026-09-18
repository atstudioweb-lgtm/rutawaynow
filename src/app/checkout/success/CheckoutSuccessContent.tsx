'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type SaveState =
  | { status: 'saving' }
  | { status: 'done'; ok: boolean; reason: string };

export function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'saving' });
  const savedRef = useRef<{ plan: string; expiry: string; provider: string } | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const provider = searchParams.get('provider') || 'stripe';
    const fallbackPlan = searchParams.get('plan_id');

    const resolvePlan = (planId: string | null, providerVal: string) => {
      const finalPlan = planId && planId.trim() ? planId : 'monthly';
      const expiry = new Date();
      if (finalPlan === 'fortnightly') {
        expiry.setDate(expiry.getDate() + 14);
      } else if (finalPlan === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else {
        expiry.setFullYear(expiry.getFullYear() + 10);
      }
      savedRef.current = { plan: finalPlan, expiry: expiry.toISOString(), provider: providerVal };
      setPlan(finalPlan);
    };

    // Retrieve plan from Stripe session or Mercado Pago payment via API route
    (async () => {
      try {
        let planId: string | null = null;
        if (provider === 'stripe') {
          if (sessionId) {
            const response = await fetch(`/api/stripe/session/${sessionId}`);
            const data = await response.json();
            if (data.planType) planId = data.planType;
          }
        } else if (provider === 'mercadopago') {
          const collectionId = searchParams.get('collection_id') || searchParams.get('payment_id');
          if (collectionId) {
            const response = await fetch(`/api/payments/mercadopago/payment/${collectionId}`);
            const data = await response.json().catch(() => ({}));
            if (data.planType) planId = data.planType;
          }
        }
        // Fallback to URL param or monthly
        resolvePlan(planId || fallbackPlan, provider);
      } catch (error) {
        console.error('Failed to retrieve payment details:', error);
        resolvePlan(fallbackPlan, provider);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  const doSave = useCallback(async () => {
    const saved = savedRef.current;
    if (!saved) return;
    setSaveState({ status: 'saving' });
    try {
      const r = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: saved.plan, expiry: saved.expiry, provider: saved.provider, usedCount: 0 }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        if (j.created) setSaveState({ status: 'done', ok: true, reason: `Plan ${saved.plan} saved to your account.` });
        else if (j.reason === 'already_active') setSaveState({ status: 'done', ok: true, reason: `Plan ${saved.plan} is already active — nothing changed.` });
        else setSaveState({ status: 'done', ok: true, reason: `Plan ${saved.plan} confirmed.` });
      } else {
        setSaveState({ status: 'done', ok: false, reason: `Save failed (${r.status}): ${j.error || 'please login with the same Google account and reopen this link'}` });
      }
    } catch {
      setSaveState({ status: 'done', ok: false, reason: 'Save failed: network error. Reopen this link while logged in.' });
    }
  }, []);

  useEffect(() => {
    if (!loading && plan && saveState.status === 'saving') doSave();
  }, [loading, plan, saveState.status, doSave]);

  // Auto-redirect only after the save was confirmed
  useEffect(() => {
    if (!loading && saveState.status === 'done' && saveState.ok) {
      const timer = setTimeout(() => {
        router.push('/account');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, saveState, router]);

  const isSaving = loading || saveState.status === 'saving';
  const succeeded = saveState.status === 'done' && saveState.ok;
  const failed = saveState.status === 'done' && !saveState.ok;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div
          className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full mb-6 ${
            failed ? 'bg-amber-100' : 'bg-indigo-100'
          }`}
        >
          {failed ? (
            <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {isSaving
            ? 'Processing payment...'
            : failed
              ? 'Payment received'
              : 'Payment successful!'}
        </h1>
        <p className="text-slate-600 mt-2">
          {isSaving ? 'Retrieving plan details...' : succeeded ? 'Redirecting to your account...' : 'Your payment went through, but the plan could not be saved to your account yet.'}
        </p>
        {!isSaving && plan && (
          <div className={`mt-4 rounded-xl p-4 text-sm font-medium ${failed ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-indigo-50 text-indigo-900'}`}>
            Plan: {plan} — {saveState.status === 'done' ? saveState.reason : ''}
          </div>
        )}
        {failed && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={doSave}
              className="inline-flex justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Retry saving plan
            </button>
            <button
              onClick={() => router.push('/account')}
              className="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}