import { prisma } from "@/lib/prisma";

const PLAN_LIMITS = { single: 1, fortnightly: 3, monthly: 10 } as const;
const PLAN_NAMES: Record<string, Record<string,string>> = {
  pt: { single: 'Avulso', fortnightly: 'Quinzenal', monthly: 'Mensal' },
  en: { single: 'Single', fortnightly: 'Fortnightly', monthly: 'Monthly' }
};

export async function getServerPlanStatus(userId: string, lang: string = 'pt') {
  const l = lang === 'en' ? 'en' : 'pt';
  const now = new Date();
  let sub = await prisma.subscription.findFirst({
    where: { userId, status: 'active', expiryAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  });
  // Fallback for old subscriptions created with mock user_123 before Google auth fix
  if (!sub && userId !== 'user_123') {
    const mockSub = await prisma.subscription.findFirst({
      where: { userId: 'user_123', status: 'active', expiryAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (mockSub) {
      // Migrate to real user
      sub = await prisma.subscription.update({ where: { id: mockSub.id }, data: { userId } });
    }
  }
  if (!sub) return { hasActivePlan:false, planType:null, planName:'', remaining:0, max:0, expiry:null, canGenerate:false, message: l==='en' ? 'No active plan. Purchase a plan to generate itineraries.' : 'Nenhum plano ativo. Adquira um plano para gerar roteiros.' };
  
  const max = PLAN_LIMITS[sub.planId as keyof typeof PLAN_LIMITS] || 0;
  // For single, usedCount is direct. For period-based, check if periodKey matches current period
  let effectiveUsed = sub.usedCount;
  const currentPeriodKey = sub.planId === 'monthly' ? new Date().toISOString().slice(0,7) : Math.floor(Date.now()/(14*24*60*60*1000)).toString();
  if (sub.planId !== 'single' && sub.periodKey !== currentPeriodKey) {
    effectiveUsed = 0; // new period
  }
  const remaining = Math.max(0, max - effectiveUsed);
  const canGenerate = remaining > 0;
  const name = PLAN_NAMES[l][sub.planId] || sub.planId;
  const msgs = {
    pt: { available: `Você tem ${remaining} de ${max} roteiros disponíveis no seu plano ${name}.`, limit: `Você atingiu o limite de ${max} roteiros no seu plano ${name}. Aguarde o próximo período ou adquira outro plano.`, singleAvail: 'Você tem 1 roteiro disponível no seu plano Avulso.', singleUsed: 'Você já utilizou seu roteiro do plano Avulso. Adquira outro plano para continuar.' },
    en: { available: `You have ${remaining} of ${max} itineraries available on your ${name} plan.`, limit: `You have reached the limit of ${max} itineraries on your ${name} plan. Wait for the next period or purchase another plan.`, singleAvail: 'You have 1 itinerary available on your Single plan.', singleUsed: 'You have already used your Single plan itinerary. Purchase another plan to continue.' }
  }[l];
  let message = '';
  if (sub.planId === 'single') message = remaining>0 ? msgs.singleAvail : msgs.singleUsed;
  else message = canGenerate ? msgs.available : msgs.limit;

  return { hasActivePlan:true, planType: sub.planId as any, planName: name, remaining, max, expiry: sub.expiryAt, canGenerate, message, subscriptionId: sub.id, periodKey: currentPeriodKey, effectiveUsed };
}

export async function incrementServerUsage(userId: string) {
  const status = await getServerPlanStatus(userId);
  if (!status.canGenerate || !(status as any).subscriptionId) return false;
  const subId = (status as any).subscriptionId as string;
  const currentPeriodKey = (status as any).periodKey as string;
  const used = (status as any).effectiveUsed as number;
  await prisma.subscription.update({
    where: { id: subId },
    data: { usedCount: used + 1, periodKey: currentPeriodKey },
  });
  return true;
}
