export type PlanType = 'single' | 'fortnightly' | 'monthly' | null;

export interface PlanStatus {
  hasActivePlan: boolean;
  planType: PlanType;
  planName: string;
  remainingItineraries: number;
  maxItineraries: number;
  expiryDate: Date | null;
  canGenerate: boolean;
  message?: string;
}

const PLAN_LIMITS = {
  single: 1,
  fortnightly: 3,
  monthly: 10,
} as const;

const PLAN_NAMES: Record<string, Record<string, string>> = {
  pt: { single: 'Avulso', fortnightly: 'Quinzenal', monthly: 'Mensal' },
  en: { single: 'Single', fortnightly: 'Fortnightly', monthly: 'Monthly' },
};

const PLAN_MESSAGES = {
  pt: {
    noActive: 'Nenhum plano ativo',
    noPlan: 'Nenhum plano ativo. Adquira um plano para gerar roteiros.',
    expired: 'Seu plano expirou. Renove para continuar gerando roteiros.',
    singleAvailable: 'Você tem 1 roteiro disponível no seu plano Avulso.',
    singleUsed: 'Você já utilizou seu roteiro do plano Avulso. Adquira outro plano para continuar.',
    available: 'Você tem {remaining} de {max} roteiros disponíveis no seu plano {name}.',
    limitReached: 'Você atingiu o limite de {max} roteiros no seu plano {name}. Aguarde o próximo período ou adquira outro plano.',
  },
  en: {
    noActive: 'No active plan',
    noPlan: 'No active plan. Purchase a plan to generate itineraries.',
    expired: 'Your plan has expired. Renew to continue generating itineraries.',
    singleAvailable: 'You have 1 itinerary available on your Single plan.',
    singleUsed: 'You have already used your Single plan itinerary. Purchase another plan to continue.',
    available: 'You have {remaining} of {max} itineraries available on your {name} plan.',
    limitReached: 'You have reached the limit of {max} itineraries on your {name} plan. Wait for the next period or purchase another plan.',
  },
};

function format(msg: string, params: Record<string, string | number>): string {
  return msg.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export function getPlanStatus(lang: string = 'pt'): PlanStatus {
  const l = lang === 'en' ? 'en' : 'pt';
  const msgs = PLAN_MESSAGES[l as keyof typeof PLAN_MESSAGES];
  const names = PLAN_NAMES[l];

  if (typeof window === 'undefined') {
    return {
      hasActivePlan: false,
      planType: null,
      planName: '',
      remainingItineraries: 0,
      maxItineraries: 0,
      expiryDate: null,
      canGenerate: false,
      message: msgs.noActive,
    };
  }

  const plan = localStorage.getItem('rutawaynow-plan');
  const expiry = localStorage.getItem('rutawaynow-plan-expiry');
  const provider = localStorage.getItem('rutawaynow-plan-provider');

  if (!plan || !expiry) {
    return {
      hasActivePlan: false,
      planType: null,
      planName: '',
      remainingItineraries: 0,
      maxItineraries: 0,
      expiryDate: null,
      canGenerate: false,
      message: msgs.noPlan,
    };
  }

  const expiryDate = new Date(expiry);
  const now = new Date();

  if (expiryDate < now) {
    return {
      hasActivePlan: false,
      planType: plan as PlanType,
      planName: names[plan] || plan,
      remainingItineraries: 0,
      maxItineraries: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 0,
      expiryDate,
      canGenerate: false,
      message: msgs.expired,
    };
  }

  const planType = plan as keyof typeof PLAN_LIMITS;
  const maxItineraries = PLAN_LIMITS[planType] || 0;

  // For single plan, check if already used
  // If usage data is missing but plan exists, assume limit was reached (conservative)
  if (plan === 'single') {
    const used = localStorage.getItem('rutawaynow-single-used');
    const usedCount = used ? parseInt(used, 10) : 1; // Conservative: assume used if missing
    const remaining = Math.max(0, 1 - usedCount);

    return {
      hasActivePlan: true,
      planType: 'single',
      planName: names.single,
      remainingItineraries: remaining,
      maxItineraries: 1,
      expiryDate,
      canGenerate: remaining > 0,
      message: remaining > 0 ? msgs.singleAvailable : msgs.singleUsed,
    };
  }

  // For subscription plans, we need to track usage
  // If usage data is missing but plan exists, assume limit was reached (conservative)
  const periodKey = planType === 'monthly'
    ? new Date().toISOString().slice(0, 7) // YYYY-MM for monthly
    : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString(); // fortnight periods

  const usageKey = `rutawaynow-usage-${plan}-${periodKey}`;
  const used = localStorage.getItem(usageKey);
  // Conservative: assume limit reached if usage data is missing
  const usedCount = used ? parseInt(used, 10) : maxItineraries;
  const remaining = Math.max(0, maxItineraries - usedCount);

  return {
    hasActivePlan: true,
    planType,
    planName: names[plan] || plan,
    remainingItineraries: remaining,
    maxItineraries: maxItineraries,
    expiryDate,
    canGenerate: remaining > 0,
    message: remaining > 0
      ? format(msgs.available, { remaining, max: maxItineraries, name: names[plan] || plan })
      : format(msgs.limitReached, { max: maxItineraries, name: names[plan] || plan }),
  };
}

export function incrementUsage(plan: string): void {
  if (typeof window === 'undefined') return;

  if (plan === 'single') {
    const used = localStorage.getItem('rutawaynow-single-used');
    const usedCount = used ? parseInt(used, 10) : 0;
    localStorage.setItem('rutawaynow-single-used', String(usedCount + 1));
    return;
  }

  const periodKey = plan === 'monthly'
    ? new Date().toISOString().slice(0, 7) // YYYY-MM for monthly
    : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString(); // fortnight periods

  const usageKey = `rutawaynow-usage-${plan}-${periodKey}`;
  const used = localStorage.getItem(usageKey);
  const usedCount = used ? parseInt(used, 10) : 0;
  localStorage.setItem(usageKey, String(usedCount + 1));
}

export function decrementUsage(plan: string): void {
  if (typeof window === 'undefined') return;

  if (plan === 'single') {
    const used = localStorage.getItem('rutawaynow-single-used');
    const usedCount = used ? parseInt(used, 10) : 0;
    if (usedCount > 0) {
      localStorage.setItem('rutawaynow-single-used', String(usedCount - 1));
    }
    return;
  }

  const periodKey = plan === 'monthly' 
    ? new Date().toISOString().slice(0, 7) // YYYY-MM for monthly
    : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString(); // fortnight periods

  const usageKey = `rutawaynow-usage-${plan}-${periodKey}`;
  const used = localStorage.getItem(usageKey);
  const usedCount = used ? parseInt(used, 10) : 0;
  if (usedCount > 0) {
    localStorage.setItem(usageKey, String(usedCount - 1));
  }
}