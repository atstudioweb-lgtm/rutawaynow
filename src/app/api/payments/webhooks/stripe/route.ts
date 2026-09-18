import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/payments/stripe/client';
import { prisma } from '@/lib/prisma';
const PLAN_LIMITS: Record<string, number> = { single: 1, fortnightly: 3, monthly: 10 };

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.client_reference_id;
  const planId = session.metadata?.plan_id;
  if (!userId || !planId) {
    console.warn('Missing userId or planId in checkout session', session.id);
    return;
  }

  // Idempotency: ignore duplicate webhooks for the same checkout session
  const existing = await prisma.subscription.findUnique({ where: { stripeSessionId: session.id } });
  if (existing) {
    console.log('Skipping already processed checkout session', session.id);
    return;
  }

  const max = PLAN_LIMITS[planId] ?? 0;
  const now = new Date();
  const expiry = new Date(now);
  if (planId === 'fortnightly') expiry.setDate(expiry.getDate() + 14);
  else if (planId === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
  else expiry.setFullYear(expiry.getFullYear() + 10);

  const periodKey = planId === 'monthly' ? now.toISOString().slice(0, 7) : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();

  try {
    await prisma.$transaction(async (tx) => {
      // Keep at most one active single subscription: supersede older active single rows
      if (planId === 'single') {
        await tx.subscription.updateMany({
          where: { userId, planId, status: 'active' },
          data: { status: 'expired' },
        });
      }
      await tx.subscription.create({
        data: {
          userId,
          planId,
          provider: 'stripe',
          status: 'active',
          startAt: now,
          expiryAt: expiry,
          maxItineraries: max,
          usedCount: 0,
          periodKey: planId === 'single' ? null : periodKey,
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription as string | null,
        },
      });
    });
  } catch (err) {
    const castErr = err as { code?: string; meta?: { target?: unknown } };
    const target = Array.isArray(castErr.meta?.target)
      ? castErr.meta.target.join(',')
      : String(castErr.meta?.target ?? '');
    if (castErr.code === 'P2002' && target.includes('stripeSessionId')) {
      console.log('Duplicate checkout session already processed', session.id);
      return;
    }
    throw err;
  }
  console.log('Created subscription', { userId, planId });
}

async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.user_id;
  const planId = subscription.metadata?.plan_id;
  const status = mapStripeStatus(subscription.status);

  console.log('Stripe subscription updated:', { userId, planId, status });

  // Keep local state in sync: any non-active Stripe status expires the entitlement.
  if (status !== 'active') {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'expired' },
    });
    console.log('Marked Stripe subscription expired', { stripeSubscriptionId: subscription.id, status });
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const userId = subscription.metadata?.user_id;

  console.log('Stripe subscription deleted:', { userId });

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'expired' },
  });
  console.log('Marked Stripe subscription expired (deleted)', { stripeSubscriptionId: subscription.id });
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const subscriptionId = invoice.subscription as string | null;
  console.log('Invoice payment succeeded:', { subscriptionId, billingReason: invoice.billing_reason });

  // Only renewal invoices ("subscription_cycle") extend the plan. The initial
  // invoice ("subscription_create") is already credited by checkout.session.completed.
  if (invoice.billing_reason !== 'subscription_cycle') {
    console.log('Skipping non-renewal invoice', { invoiceId: invoice.id, billingReason: invoice.billing_reason });
    return;
  }
  if (!subscriptionId) {
    console.warn('Renewal invoice without subscription id', invoice.id);
    return;
  }

  const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
  if (!sub || sub.planId === 'single') {
    console.warn('No renew-able local subscription for invoice', { invoiceId: invoice.id, subscriptionId });
    return;
  }

  // Idempotency: skip if this same invoice already extended the period.
  if (sub.stripeLastInvoiceId === invoice.id) {
    console.log('Renewal invoice already applied, skipping', { subscriptionId: sub.id, invoiceId: invoice.id });
    return;
  }

  // Extend from max(now, current expiry) so an early/redelivered invoice never shortens the period.
  const now = new Date();
  const base = sub.expiryAt > now ? sub.expiryAt : now;
  const expiry = new Date(base);
  if (sub.planId === 'fortnightly') expiry.setDate(expiry.getDate() + 14);
  else if (sub.planId === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
  else return;

  const periodKey = sub.planId === 'monthly'
    ? now.toISOString().slice(0, 7)
    : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'active', expiryAt: expiry, usedCount: 0, periodKey, stripeLastInvoiceId: invoice.id },
  });
  console.log('Renewed subscription from invoice', { userId: sub.userId, planId: sub.planId, expiryAt: expiry.toISOString(), invoiceId: invoice.id });
}

async function handleInvoicePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription;
  console.log('Invoice payment failed:', { subscriptionId });
}

function mapStripeStatus(status: string): string {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'inactive';
  }
}