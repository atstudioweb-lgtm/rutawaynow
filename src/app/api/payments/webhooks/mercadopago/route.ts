import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyMercadoPagoWebhookSignature,
  parseExternalReference,
  getMercadoPagoAuthorizedPayment,
} from '@/lib/payments/mercadopago/webhooks';
import { getMercadoPagoPayment, getMercadoPagoSubscription } from '@/lib/payments/mercadopago/checkout';

const PLAN_LIMITS_MP: Record<string, number> = { single: 1, fortnightly: 3, monthly: 10 };

interface MercadoPagoWebhookPayload {
  type?: string;
  topic?: string;
  id?: string | number;
  data?: { id?: string | number };
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const headersList = await headers();
  const signature = headersList.get('x-signature');
  const requestId = headersList.get('x-request-id');

  let event: MercadoPagoWebhookPayload;
  try {
    event = JSON.parse(bodyText) as MercadoPagoWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const queryDataId = req.nextUrl.searchParams.get('data.id') || undefined;
  const dataId = queryDataId ?? String(event.data?.id ?? event.id ?? '');

  if (!verifyMercadoPagoWebhookSignature({ signature, requestId, dataId })) {
    console.error('Mercado Pago webhook signature verification failed');
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const topic =
    (event.type ?? event.topic ?? req.nextUrl.searchParams.get('type')) as string;
  const id = String(event.data?.id ?? event.id ?? queryDataId ?? '');

  if (!topic || !id) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  console.log('Mercado Pago webhook:', { topic, id });

  try {
    switch (topic) {
      case 'payment':
        await handlePaymentNotification(id);
        break;
      case 'subscription_preapproval':
        await handleSubscriptionNotification(id);
        break;
      case 'subscription_preapproval_plan':
        await handlePreapprovalPlanNotification(id);
        break;
      case 'subscription_authorized_payment':
        await handleAuthorizedPaymentNotification(id);
        break;
      default:
        // merchant_order and other topics don't require action here
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Mercado Pago webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentNotification(paymentId: string) {
  const payment = await getMercadoPagoPayment(paymentId);
  if (payment.status !== 'approved') {
    console.log('Mercado Pago payment not approved, skipping', { paymentId, status: payment.status });
    return;
  }

  const { userId, planId } = parseExternalReference(payment.external_reference);
  const resolvedPlanId =
    planId || (payment.metadata as { plan_id?: string } | undefined)?.plan_id;
  if (!userId || !resolvedPlanId) {
    console.warn('Missing userId or planId in Mercado Pago payment', paymentId);
    return;
  }

  await creditPlan({ userId, planId: resolvedPlanId, mercadoPagoId: paymentId });
}

async function handleSubscriptionNotification(preapprovalId: string) {
  const preapproval = await getMercadoPagoSubscription(preapprovalId);
  if (preapproval.status !== 'authorized' && preapproval.status !== 'approved') {
    console.log('Mercado Pago preapproval not active, skipping', { preapprovalId, status: preapproval.status });
    return;
  }

  const { userId, planId } = parseExternalReference(preapproval.external_reference);
  if (!userId || !planId) {
    console.warn('Missing userId or planId in Mercado Pago preapproval', preapprovalId);
    return;
  }

  await creditPlan({ userId, planId, mercadoPagoId: preapprovalId });
}

async function handlePreapprovalPlanNotification(planId: string) {
  console.log('Mercado Pago preapproval plan notification (no action):', planId);
}

async function handleAuthorizedPaymentNotification(authorizedPaymentId: string) {
  const authorizedPayment = await getMercadoPagoAuthorizedPayment(authorizedPaymentId);
  if (authorizedPayment.status !== 'approved') {
    console.log('Mercado Pago authorized payment not approved, skipping', {
      authorizedPaymentId,
      status: authorizedPayment.status,
    });
    return;
  }

  const preapprovalId = authorizedPayment.preapproval_id;
  if (!preapprovalId) {
    console.warn('Authorized payment has no preapproval_id', authorizedPaymentId);
    return;
  }

  const preapproval = await getMercadoPagoSubscription(String(preapprovalId));
  const { userId, planId } = parseExternalReference(preapproval.external_reference);
  if (!userId || !planId) {
    console.warn('Missing userId or planId for authorized payment', { authorizedPaymentId, preapprovalId });
    return;
  }

  await creditPlan({ userId, planId, mercadoPagoId: authorizedPaymentId });
}

function computeExpiry(planId: string) {
  const now = new Date();
  const expiry = new Date(now);
  if (planId === 'fortnightly') expiry.setDate(expiry.getDate() + 14);
  else if (planId === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
  else expiry.setFullYear(expiry.getFullYear() + 10);
  return { now, expiry };
}

function computePeriodKey(planId: string, now: Date): string | null {
  if (planId === 'single') return null;
  if (planId === 'monthly') return now.toISOString().slice(0, 7);
  return Math.floor(now.getTime() / (14 * 24 * 60 * 60 * 1000)).toString();
}

async function creditPlan(params: { userId: string; planId: string; mercadoPagoId: string }) {
  const { userId, planId, mercadoPagoId } = params;
  const max = PLAN_LIMITS_MP[planId] ?? 0;
  if (!max) {
    console.warn('Unknown Mercado Pago plan, skipping credit', { userId, planId, mercadoPagoId });
    return false;
  }

  // Couldn't credit a user that does not exist (e.g. checkout done without login).
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) {
    console.warn('Mercado Pago credit skipped: user not found', { userId, planId, mercadoPagoId });
    return false;
  }

  // Idempotency: never credit the same Mercado Pago id twice.
  const existingById = await prisma.subscription.findUnique({ where: { mercadoPagoId } });
  if (existingById) {
    console.log('Mercado Pago payment already credited, skipping', { mercadoPagoId });
    return false;
  }

  const { now, expiry } = computeExpiry(planId);
  const periodKey = computePeriodKey(planId, now);

  // Guard against the preapproval + first authorized payment both firing for
  // the same period (and against duplicate webhook deliveries).
  if (periodKey) {
    const existingPeriod = await prisma.subscription.findFirst({
      where: { userId, provider: 'mercadopago', planId, periodKey },
    });
    if (existingPeriod) {
      console.log('Mercado Pago period already credited, skipping', { userId, planId, periodKey });
      return false;
    }
  }

  await prisma.subscription.create({
    data: {
      userId,
      planId,
      provider: 'mercadopago',
      status: 'active',
      startAt: now,
      expiryAt: expiry,
      maxItineraries: max,
      usedCount: 0,
      periodKey,
      mercadoPagoId,
    },
  });
  console.log('Created Mercado Pago subscription', { userId, planId, mercadoPagoId });
  return true;
}