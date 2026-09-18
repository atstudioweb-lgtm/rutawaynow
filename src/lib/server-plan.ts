import { prisma } from "@/lib/prisma";

const PLAN_LIMITS = { single: 1, fortnightly: 3, monthly: 10 } as const;
const PLAN_NAMES: Record<string, Record<string,string>> = {
  pt: { single: 'Avulso', fortnightly: 'Quinzenal', monthly: 'Mensal' },
  en: { single: 'Single', fortnightly: 'Fortnightly', monthly: 'Monthly' }
};

export type ServerPlanStatus = {
  hasActivePlan: boolean;
  planType: 'single' | 'fortnightly' | 'monthly' | null;
  planName: string;
  remaining: number;
  max: number;
  expiry: Date | null;
  canGenerate: boolean;
  message: string;
  subscriptionId?: string;
  periodKey?: string;
  effectiveUsed?: number;
};

export async function getServerPlanStatus(userId: string, lang: string = 'pt'): Promise<ServerPlanStatus> {
  const l = lang === 'en' ? 'en' : 'pt';
  const now = new Date();
  let subs = await prisma.subscription.findMany({
    where: { userId, status: 'active', expiryAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  });
  // Fallback for old subscriptions created with mock user_123 before Google auth fix
  if (subs.length === 0 && userId !== 'user_123') {
    const mockSub = await prisma.subscription.findFirst({
      where: { userId: 'user_123', status: 'active', expiryAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (mockSub) {
      // Migrate to real user
      const migrated = await prisma.subscription.update({ where: { id: mockSub.id }, data: { userId } });
      subs = [migrated];
    }
  }
  // Pick the best subscription: first with remaining > 0, otherwise most recent (to show limit message)
  let sub: typeof subs[number] | null = null;
  let subRemaining = 0;
  let subEffectiveUsed = 0;
  let subPeriodKey = '';
  for (const candidate of subs) {
    const candMax = PLAN_LIMITS[candidate.planId as keyof typeof PLAN_LIMITS] || 0;
    const candPeriodKey = candidate.planId === 'monthly' ? now.toISOString().slice(0, 7) : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();
    const candEffective = candidate.planId === 'single' ? candidate.usedCount : (candidate.periodKey !== candPeriodKey ? 0 : candidate.usedCount);
    const candRemaining = Math.max(0, candMax - candEffective);
    if (candRemaining > 0) {
      sub = candidate;
      subRemaining = candRemaining;
      subEffectiveUsed = candEffective;
      subPeriodKey = candPeriodKey;
      break;
    }
    // keep most recent as fallback to show exhausted message
    if (!sub) {
      sub = candidate;
      subRemaining = candRemaining;
      subEffectiveUsed = candEffective;
      subPeriodKey = candPeriodKey;
    }
  }
  if (!sub) return { hasActivePlan:false, planType:null, planName:'', remaining:0, max:0, expiry:null, canGenerate:false, message: l==='en' ? 'No active plan. Purchase a plan to generate itineraries.' : 'Nenhum plano ativo. Adquira um plano para gerar roteiros.' };

  const max = PLAN_LIMITS[sub.planId as keyof typeof PLAN_LIMITS] || 0;
  const effectiveUsed = subEffectiveUsed;
  const currentPeriodKey = subPeriodKey;
  const remaining = subRemaining;
  const canGenerate = remaining > 0;
  const name = PLAN_NAMES[l][sub.planId] || sub.planId;
  const msgs = {
    pt: { available: `Você tem ${remaining} de ${max} roteiros disponíveis no seu plano ${name}.`, limit: `Você atingiu o limite de ${max} roteiros no seu plano ${name}. Aguarde o próximo período ou adquira outro plano.`, singleAvail: 'Você tem 1 roteiro disponível no seu plano Avulso.', singleUsed: 'Você já utilizou seu roteiro do plano Avulso. Adquira outro plano para continuar.' },
    en: { available: `You have ${remaining} of ${max} itineraries available on your ${name} plan.`, limit: `You have reached the limit of ${max} itineraries on your ${name} plan. Wait for the next period or purchase another plan.`, singleAvail: 'You have 1 itinerary available on your Single plan.', singleUsed: 'You have already used your Single plan itinerary. Purchase another plan to continue.' }
  }[l];
  let message = '';
  if (sub.planId === 'single') message = remaining>0 ? msgs.singleAvail : msgs.singleUsed;
  else message = canGenerate ? msgs.available : msgs.limit;

  return { hasActivePlan:true, planType: sub.planId as 'single' | 'fortnightly' | 'monthly', planName: name, remaining, max, expiry: sub.expiryAt, canGenerate, message, subscriptionId: sub.id, periodKey: currentPeriodKey, effectiveUsed };
}

export async function incrementServerUsage(userId: string) {
  const status = await getServerPlanStatus(userId);
  if (!status.canGenerate || !status.subscriptionId) return false;
  const subId = status.subscriptionId;
  const currentPeriodKey = status.periodKey ?? '';
  const used = status.effectiveUsed ?? 0;
  await prisma.subscription.update({
    where: { id: subId },
    data: { usedCount: used + 1, periodKey: currentPeriodKey },
  });
  return true;
}
