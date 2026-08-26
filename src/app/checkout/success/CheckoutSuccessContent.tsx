'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { Icon } from '@/components/icons';

export function CheckoutSuccessContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const planId = searchParams.get('plan_id');
    const providerParam = searchParams.get('provider');

    if (sessionId || planId) {
      // Use planId from URL if available, otherwise preserve existing localStorage plan
      const plan = planId || localStorage.getItem('rutawaynow-plan') || 'monthly';
      const provider = providerParam || localStorage.getItem('rutawaynow-plan-provider') || 'stripe';
      const expiry = new Date();
      
      // Set expiry based on plan
      if (plan === 'fortnightly') {
        expiry.setDate(expiry.getDate() + 14);
      } else if (plan === 'monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else {
        // Single purchase - no expiry
        expiry.setFullYear(expiry.getFullYear() + 10);
      }

      // Set plan data first (before any usage operations)
      localStorage.setItem('rutawaynow-plan', plan);
      localStorage.setItem('rutawaynow-plan-provider', providerParam || 'stripe');
      localStorage.setItem('rutawaynow-plan-expiry', expiry.toISOString());
      
      // Only initialize usage counters if they don't already exist
      // This preserves existing usage when user re-opens the app or clears cache partially
      const periodKey = plan === 'monthly' 
        ? new Date().toISOString().slice(0, 7)
        : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();
      
      // Initialize single plan usage only if not already set
      const existingSingleUsed = localStorage.getItem('rutawaynow-single-used');
      if (!existingSingleUsed) {
        localStorage.setItem('rutawaynow-single-used', '0');
      }
      
      // Initialize subscription plan usage only if not already set
      const existingUsageKey = `rutawaynow-usage-${plan}-${periodKey}`;
      const existingUsage = localStorage.getItem(existingUsageKey);
      if (!existingUsage) {
        localStorage.setItem(existingUsageKey, '0');
      }
    }

    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 mb-6">
          <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {typeof window !== 'undefined' && localStorage.getItem('rutawaynow-plan-provider') === 'mercadopago' 
            ? 'Pagamento aprovado!' 
            : 'Payment successful!'}
        </h1>
        <p className="text-slate-600 mt-2">
          Redirecting to dashboard...
        </p>
      </div>
    </div>
  );
}