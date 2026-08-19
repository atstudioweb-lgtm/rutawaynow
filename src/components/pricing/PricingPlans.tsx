'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/provider';
import { getAllPlans, Plan, formatPrice, getPriceForCurrency } from '@/config/pricing';
import { Button } from '@/components/ui/button';

type Currency = 'BRL' | 'USD' | 'EUR';

function formatPriceWithCurrency(amount: number, currency: 'BRL' | 'USD' | 'EUR'): string {
  return new Intl.NumberFormat(
    currency === 'BRL' ? 'pt-BR' : currency === 'USD' ? 'en-US' : 'de-DE',
    { style: 'currency', currency, minimumFractionDigits: 2 }
  ).format(amount);
}

function getCurrencySymbol(currency: 'BRL' | 'USD' | 'EUR'): string {
  return currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€';
}

export function PricingPlans() {
  const { t, lang } = useI18n();
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'mercadopago'>('stripe');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<Currency>('BRL');

  const plans = getAllPlans();

  useEffect(() => {
    const saved = localStorage.getItem('rutawaynow-currency');
    if (saved && ['BRL', 'USD', 'EUR'].includes(saved)) {
      setUserCurrency(saved as Currency);
    } else {
      // Sync with app language
      if (lang === 'en') setUserCurrency('USD');
      else setUserCurrency('BRL');
    }
  }, [lang]);

  const currency = userCurrency;

  const handleCurrencyChange = (newCurrency: Currency) => {
    setUserCurrency(newCurrency);
    localStorage.setItem('rutawaynow-currency', newCurrency);
  };

  const handleSelectPlan = async (plan: Plan, provider: 'stripe' | 'mercadopago') => {
    setLoadingPlan(plan.id);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const successUrl = `${baseUrl}/checkout/success`;
      const cancelUrl = `${baseUrl}/pricing`;

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          currency,
          provider,
          successUrl,
          cancelUrl,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erro ao criar sessão de pagamento');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erro ao iniciar pagamento');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('pricing.title') || 'Escolha seu plano'}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('pricing.subtitle') || 'Comece a planejar suas viagens hoje'}
          </p>
        </div>

        {/* Currency Selector */}
        <div className="mb-8 flex justify-center items-center gap-3">
          <label className="text-sm text-slate-600">{t('pricing.currency') || 'Moeda:'}</label>
          <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
            {(['BRL', 'USD', 'EUR'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => handleCurrencyChange(curr)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currency === curr
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {getCurrencySymbol(curr)}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Selector */}
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setSelectedProvider('stripe')}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${
              selectedProvider === 'stripe'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            💳 Stripe (Cartão Internacional)
          </button>
          <button
            onClick={() => setSelectedProvider('mercadopago')}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${
              selectedProvider === 'mercadopago'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🇧🇷 Mercado Pago (PIX + Cartão BR)
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getAllPlans().map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              selectedProvider={selectedProvider}
              loading={loadingPlan === plan.id}
              onSelect={(provider) => handleSelectPlan(plan, provider)}
            />
          ))}
        </div>

        {/* Payment Methods Info */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
          <div className="p-4 rounded-xl bg-indigo-50">
            <h3 className="font-semibold text-indigo-900">💳 Stripe</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Cartões internacionais, Google Pay, Apple Pay, Link
            </p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50">
            <h3 className="font-semibold text-indigo-900">🇧🇷 Mercado Pago</h3>
            <p className="text-sm text-indigo-700 mt-1">
              PIX, Cartões brasileiros, Boleto, Saldo Mercado Pago
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  currency,
  selectedProvider,
  loading,
  onSelect,
}: {
  plan: Plan;
  currency: 'BRL' | 'USD' | 'EUR';
  selectedProvider: 'stripe' | 'mercadopago';
  loading: boolean;
  onSelect: (provider: 'stripe' | 'mercadopago') => void;
}) {
  const { t } = useI18n();
  const isPopular = plan.popular;

  const price = plan.prices[currency] || plan.prices.BRL;

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-shadow ${
        isPopular
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
          : 'border-slate-200 hover:shadow-md'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-full">
            {t('pricing.popular') || 'Mais popular'}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">{t(plan.nameKey)}</h3>
        <p className="mt-1 text-sm text-slate-600">{t(plan.descriptionKey)}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900">
            {formatPriceWithCurrency(price, currency)}
          </span>
          {plan.interval && (
            <span className="text-sm text-slate-500">
              /{t(plan.interval === 'month' ? 'pricing.month' : 'pricing.fortnight')}
            </span>
          )}
        </div>
        {!plan.interval && (
          <p className="text-sm text-slate-500 mt-1">{t('pricing.oneTime')}</p>
        )}
      </div>

      <ul className="mb-6 space-y-3">
        {plan.featuresKeys.map((featureKey, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
            <svg className="mt-0.5 h-5 w-5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t(featureKey)}
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        size="lg"
        variant={isPopular ? 'default' : 'outline'}
        disabled={loading}
        onClick={() => onSelect(selectedProvider)}
      >
        {loading ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('common.loading') || 'Carregando...'}
          </>
        ) : (
          `${t('pricing.selectProvider', { provider: selectedProvider === 'mercadopago' ? 'Mercado Pago' : 'Stripe' })}`
        )}
      </Button>
    </div>
  );
}