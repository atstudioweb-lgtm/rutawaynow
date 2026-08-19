export type PlanId = 'single' | 'fortnightly' | 'monthly';

export interface Plan {
  id: PlanId;
  nameKey: string;
  descriptionKey: string;
  itineraries: number;
  interval?: 'month' | 'fortnight';
  prices: {
    BRL: number;
    USD: number;
    EUR: number;
  };
  featuresKeys: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  single: {
    id: 'single',
    nameKey: 'pricing.single.name',
    descriptionKey: 'pricing.single.description',
    itineraries: 1,
    prices: {
      BRL: 9.90,
      USD: 1.99,
      EUR: 1.89,
    },
    featuresKeys: [
      'pricing.single.feature1',
      'pricing.single.feature2',
      'pricing.single.feature3',
      'pricing.single.feature4',
      'pricing.single.feature5',
    ],
  },
  fortnightly: {
    id: 'fortnightly',
    nameKey: 'pricing.fortnightly.name',
    descriptionKey: 'pricing.fortnightly.description',
    itineraries: 3,
    interval: 'fortnight',
    prices: {
      BRL: 19.90,
      USD: 3.99,
      EUR: 3.79,
    },
    featuresKeys: [
      'pricing.fortnightly.feature1',
      'pricing.fortnightly.feature2',
      'pricing.fortnightly.feature3',
      'pricing.fortnightly.feature4',
      'pricing.fortnightly.feature5',
    ],
    popular: true,
  },
  monthly: {
    id: 'monthly',
    nameKey: 'pricing.monthly.name',
    descriptionKey: 'pricing.monthly.description',
    itineraries: 10,
    interval: 'month',
    prices: {
      BRL: 34.90,
      USD: 6.99,
      EUR: 6.49,
    },
    featuresKeys: [
      'pricing.monthly.feature1',
      'pricing.monthly.feature2',
      'pricing.monthly.feature3',
      'pricing.monthly.feature4',
      'pricing.monthly.feature5',
      'pricing.monthly.feature6',
    ],
  },
};

export function getPlan(id: PlanId) {
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