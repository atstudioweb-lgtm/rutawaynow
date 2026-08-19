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

const PLAN_NAMES: Record<string, string> = {
  single: 'Avulso',
  fortnightly: 'Quinzenal',
  monthly: 'Mensal',
};

export function getPlanStatus(): PlanStatus {
  if (typeof window === 'undefined') {
    return {
      hasActivePlan: false,
      planType: null,
      planName: '',
      remainingItineraries: 0,
      maxItineraries: 0,
      expiryDate: null,
      canGenerate: false,
      message: 'Nenhum plano ativo',
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
      message: 'Nenhum plano ativo. Adquira um plano para gerar roteiros.',
    };
  }

  const expiryDate = new Date(expiry);
  const now = new Date();

  if (expiryDate < now) {
    return {
      hasActivePlan: false,
      planType: plan as PlanType,
      planName: PLAN_NAMES[plan] || plan,
      remainingItineraries: 0,
      maxItineraries: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 0,
      expiryDate,
      canGenerate: false,
      message: 'Seu plano expirou. Renove para continuar gerando roteiros.',
    };
  }

  const planType = plan as keyof typeof PLAN_LIMITS;
  const maxItineraries = PLAN_LIMITS[planType] || 0;

  // For single plan, check if already used
  if (plan === 'single') {
    const used = localStorage.getItem('rutawaynow-single-used');
    const usedCount = used ? parseInt(used, 10) : 0;
    const remaining = Math.max(0, 1 - usedCount);

    return {
      hasActivePlan: true,
      planType: 'single',
      planName: PLAN_NAMES.single,
      remainingItineraries: remaining,
      maxItineraries: 1,
      expiryDate,
      canGenerate: remaining > 0,
      message: remaining > 0 
        ? 'Você tem 1 roteiro disponível no seu plano Avulso.'
        : 'Você já utilizou seu roteiro do plano Avulso. Adquira outro plano para continuar.',
    };
  }

  // For subscription plans, we need to track usage
  // We'll store usage in localStorage with format: rutawaynow-usage-{planType}-{periodKey}
  const periodKey = planType === 'monthly'
    ? new Date().toISOString().slice(0, 7) // YYYY-MM for monthly
    : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString(); // fortnight periods

  const usageKey = `rutawaynow-usage-${plan}-${periodKey}`;
  const used = localStorage.getItem(usageKey);
  const usedCount = used ? parseInt(used, 10) : 0;
  const remaining = Math.max(0, maxItineraries - usedCount);

  return {
    hasActivePlan: true,
    planType,
    planName: PLAN_NAMES[plan] || plan,
    remainingItineraries: remaining,
    maxItineraries: maxItineraries,
    expiryDate,
    canGenerate: remaining > 0,
    message: remaining > 0
      ? `Você tem ${remaining} de ${maxItineraries} roteiros disponíveis no seu plano ${PLAN_NAMES[plan]}.`
      : `Você atingiu o limite de ${maxItineraries} roteiros no seu plano ${PLAN_NAMES[plan]}. Aguarde o próximo período ou adquira outro plano.`,
  };
}

export function incrementUsage(plan: string): void {
  if (typeof window === 'undefined') return;

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