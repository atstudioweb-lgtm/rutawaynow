import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/payments/stripe/client';

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
  const currency = session.metadata?.currency;
  const isSubscription = session.mode === 'subscription';

  console.log('Stripe checkout completed:', { userId, planId, currency, isSubscription });

  // TODO: Update user subscription in database
  // await db.updateUserSubscription(userId, {
  //   planId,
  //   currency,
  //   stripeCustomerId: session.customer,
  //   stripeSubscriptionId: session.subscription,
  //   status: 'active',
  // });
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