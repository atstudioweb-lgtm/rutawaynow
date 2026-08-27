'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { Icon } from '@/components/icons';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutSuccessContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    // Retrieve plan from Stripe session
    (async () => {
      try {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }
        const session = await stripe.retrieveSession(sessionId!);
        const planType = session.metadata?.planType;
        setPlan(planType);
      } catch (error) {
        console.error('Failed to retrieve Stripe session:', error);
        // Fallback to URL param or monthly
        const planId = searchParams.get('plan_id');
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
      localStorage.setItem('rutawaynow-plan', plan);
      localStorage.setItem('rutawaynow-plan-provider', 'stripe');
      localStorage.setItem('rutawaynow-plan-expiry', expiry.toISOString());
      
      // Only initialize usage counters if they don't already exist
      const periodKey = plan === 'monthly' 
        ? new Date().toISOString().slice(0, 7)
        : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();
      
      const existingSingleUsed = localStorage.getItem('rutawaynow-single-used');
      if (!existingSingleUsed) {
        localStorage.setItem('rutawaynow-single-used', '0');
      }
      
      const existingUsageKey = `rutawaynow-usage-${plan}-${periodKey}`;
      const existingUsage = localStorage.getItem(existingUsageKey);
      if (!existingUsage) {
        localStorage.setItem(existingUsageKey, '0');
      }
    }
  }, [plan, loading]);

  // Redirect to dashboard after a short delay
  useEffect(() => {
    if (!loading && plan) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
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
            : typeof window !== 'undefined' && localStorage.getItem('rutawaynow-plan-provider') === 'mercadopago' 
              ? 'Pagamento aprovado!' 
              : 'Payment successful!'}
        </h1>
        <p className="text-slate-600 mt-2">
          {loading ? 'Retrieving plan details...' : 'Redirecting to dashboard...'}
        </p>
      </div>
    </div>
  );
}