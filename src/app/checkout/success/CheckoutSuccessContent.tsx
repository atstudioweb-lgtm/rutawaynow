'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>('Saving plan to your account...');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const provider = searchParams.get('provider') || 'stripe';
    const fallbackPlan = searchParams.get('plan_id');

    // Retrieve plan from Stripe session or Mercado Pago payment via API route
    (async () => {
      try {
        if (provider === 'stripe') {
          if (!sessionId) {
            throw new Error('No session ID');
          }
          const response = await fetch(`/api/stripe/session/${sessionId}`);
          const data = await response.json();
          if (data.planType) {
            setPlan(data.planType);
            return;
          }
        } else if (provider === 'mercadopago') {
          const collectionId = searchParams.get('collection_id') || searchParams.get('payment_id');
          if (collectionId) {
            const response = await fetch(`/api/payments/mercadopago/payment/${collectionId}`);
            const data = await response.json().catch(() => ({}));
            if (data.planType) {
              setPlan(data.planType);
              return;
            }
          }
        }
        // Fallback to URL param or monthly
        const planId = fallbackPlan;
        const plan = planId && planId.trim() ? planId : 'monthly';
        setPlan(plan);
      } catch (error) {
        console.error('Failed to retrieve payment details:', error);
        // Fallback to URL param or monthly
        const planId = fallbackPlan;
        const plan = planId && planId.trim() ? planId : 'monthly';
        setPlan(plan);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    if (!loading && plan) {
      const expiry = new Date();
      if (plan === 'fortnightly') {
        expiry.setDate(expiry.getDate() + 14);
      } else if (plan === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else {
        expiry.setFullYear(expiry.getFullYear() + 10);
      }
      const provider = searchParams.get('provider') || 'stripe';
      // Persist to user account DB (sole source of truth - no localStorage)
      fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, expiry: expiry.toISOString(), provider, usedCount: 0 }),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok) setSaveStatus(`Plan ${plan} saved to your account.`);
        else setSaveStatus(`Save failed (${r.status}): ${j.error || 'please login with the same Google account and reopen this link'}`);
      }).catch(()=>{ setSaveStatus('Save failed: network error. Reopen this link while logged in.'); });
    }
  }, [plan, loading, searchParams]);

  // Redirect to dashboard after a short delay (longer so save can finish)
  useEffect(() => {
    if (!loading && plan) {
      const timer = setTimeout(() => {
        router.push('/account');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [plan, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 mb-6">
          <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {loading
            ? 'Processing payment...'
            : 'Payment successful!'}
        </h1>
        <p className="text-slate-600 mt-2">
          {loading ? 'Retrieving plan details...' : 'Redirecting to your account...'}
        </p>
        {!loading && plan && (
          <p className="mt-3 text-sm font-medium text-slate-700">
            Plan: {plan} {saveStatus ? `— ${saveStatus}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}