export type PlanId = 'single' | 'fortnightly' | 'monthly';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  itineraries: number;
  interval?: 'month' | 'fortnight';
  prices: {
    BRL: number;
    USD: number;
    EUR: number;
  };
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  single: {
    id: 'single',
    name: 'Avulso',
    description: 'Ideal para uma viagem única',
    itineraries: 1,
    prices: {
      BRL: 9.90,
      USD: 1.99,
      EUR: 1.89,
    },
    features: [
      '1 roteiro completo',
      'Checklist de viagem',
      'Tradução automática',
      'PDF para download',
      'Acesso vitalício a este roteiro',
    ],
  },
  fortnightly: {
    id: 'fortnightly',
    name: 'Quinzenal',
    description: 'Para quem viaja frequentemente',
    itineraries: 3,
    interval: 'fortnight',
    prices: {
      BRL: 19.90,
      USD: 3.99,
      EUR: 3.79,
    },
    features: [
      '3 roteiros por mês',
      'Checklist de viagem',
      'Tradução automática',
      'PDF para download',
      'Suporte prioritário',
    ],
    popular: true,
  },
  monthly: {
    id: 'monthly',
    name: 'Mensal',
    description: 'Para viajantes assíduos e famílias',
    itineraries: 10,
    interval: 'month',
    prices: {
      BRL: 34.90,
      USD: 6.99,
      EUR: 6.49,
    },
    features: [
      '10 roteiros por mês',
      'Checklist de viagem',
      'Tradução automática',
      'PDF para download',
      'Suporte prioritário',
      'Acesso antecipado a novidades',
    ],
  },
};

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}

export function getPriceForCurrency(plan: Plan, currency: 'BRL' | 'USD' | 'EUR'): number {
  return plan.prices[currency] || plan.prices.BRL;
}

export function formatPrice(amount: number, currency: 'BRL' | 'USD' | 'EUR'): string {
  const formatter = new Intl.NumberFormat(
    currency === 'BRL' ? 'pt-BR' : currency === 'USD' ? 'en-US' : 'de-DE',
    { style: 'currency', currency, minimumFractionDigits: 2 }
  );
  return formatter.format(amount);
}