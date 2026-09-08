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
  const max = PLAN_LIMITS[planId] ?? 0;
  const now = new Date();
  const expiry = new Date(now);
  if (planId === 'fortnightly') expiry.setDate(expiry.getDate() + 14);
  else if (planId === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
  else expiry.setFullYear(expiry.getFullYear() + 10);

  const periodKey = planId === 'monthly' ? now.toISOString().slice(0, 7) : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();

  await prisma.subscription.create({
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
  console.log('Created subscription', { userId, planId });
}

async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.user_id;
  const planId = subscription.metadata?.plan_id;
  const status = subscription.status;

  console.log('Stripe subscription updated:', { userId, planId, status });

  // TODO: Update subscription in database
  // await db.updateUserSubscription(userId, {
  //   status: mapStripeStatus(status),
  //   stripeSubscriptionId: subscription.id,
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });
}

async function handleSubscriptionDeleted(subscription: any) {
  const userId = subscription.metadata?.user_id;

  console.log('Stripe subscription deleted:', { userId });

  // TODO: Update user subscription in database
  // await db.updateUserSubscription(userId, {
  //   status: 'canceled',
  //   stripeSubscriptionId: null,
  // });
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const subscriptionId = invoice.subscription;
  console.log('Invoice payment succeeded:', { subscriptionId });
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