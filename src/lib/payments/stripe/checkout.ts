import { getStripe } from './client';
import { Plan, getPriceForCurrency } from '@/config/pricing';

export interface CreateCheckoutParams {
  plan: Plan;
  currency: 'BRL' | 'USD' | 'EUR';
  userId: string;
  userEmail: string;
  userName?: string;
  successUrl: string;
  cancelUrl: string;
  provider: 'stripe' | 'mercadopago';
  t: (key: string, params?: Record<string, string | number>) => string;
}

export async function createStripeCheckoutSession(params: CreateCheckoutParams) {
  const { plan, currency, userId, userEmail, userName, successUrl, cancelUrl, t } = params;

  const amount = getPriceForCurrency(params.plan, currency);

  const isSubscription = params.plan.interval !== undefined;

  const lineItems = [{
    price_data: {
      currency: currency.toLowerCase(),
      unit_amount: Math.round(amount * 100),
      product_data: {
        name: `RutawayNow - ${t(params.plan.nameKey)}`,
        description: `${params.plan.itineraries} ${t('pricing.itinerary' + (params.plan.itineraries > 1 ? 's' : ''))}${params.plan.interval ? ` / ${t(params.plan.interval === 'month' ? 'pricing.month' : 'pricing.fortnight')}` : ''}`,
        metadata: {
          plan_id: params.plan.id,
        },
      },
      ...(isSubscription && {
        recurring: {
          interval: (params.plan.interval === 'month' ? 'month' : 'week') as 'month' | 'week',
          interval_count: params.plan.interval === 'fortnight' ? 2 : 1,
        },
      }),
    },
    quantity: 1,
  }];

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: isSubscription ? 'subscription' : 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      user_id: userId,
      plan_id: params.plan.id,
      currency,
      provider: 'stripe',
    },
    subscription_data: isSubscription ? {
      metadata: {
        user_id: userId,
        plan_id: params.plan.id,
        currency,
      },
    } : undefined,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

export async function createStripePortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function getStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}