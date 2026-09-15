import { preference, preApprovalPlan, preApproval, payment } from './client';
import { Plan, getPriceForCurrency } from '@/config/pricing';
import { getTranslation } from '@/lib/i18n-server';

export interface CreateMercadoPagoParams {
  plan: Plan;
  currency: 'BRL';
  userId: string;
  userEmail: string;
  userName?: string;
  userPhone?: string;
  userDocument?: string; // CPF
  successUrl: string;
  cancelUrl: string;
  provider: 'stripe' | 'mercadopago';
}

interface MercadoPagoRedirect {
  init_point?: string;
  sandbox_init_point?: string;
}

export async function createMercadoPagoPreference(params: CreateMercadoPagoParams) {
  const { plan, userId, userEmail, userName, userPhone, userDocument, successUrl, cancelUrl } = params;

  const amount = getPriceForCurrency(params.plan, 'BRL');
  const isSubscription = params.plan.interval !== undefined;

  const { t } = getTranslation('pt');

  const preferenceData = {
    items: [{
      id: params.plan.id,
      title: `RutawayNow - ${t(params.plan.nameKey)}`,
      description: `${params.plan.itineraries} ${t(params.plan.itineraries > 1 ? 'pricing.itineraries' : 'pricing.itinerary')}${params.plan.interval ? ` / ${t(params.plan.interval === 'month' ? 'pricing.month' : 'pricing.fortnight')}` : ''}`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: amount,
    }],
    payer: {
      email: userEmail,
      name: userName?.split(' ')[0],
      surname: userName?.split(' ').slice(1).join(' ') || '',
      ...(userPhone
        ? { phone: { area_code: userPhone.replace(/\D/g, '').slice(0, 2), number: userPhone.replace(/\D/g, '').slice(2) } }
        : {}),
      ...(userDocument
        ? { identification: { type: 'CPF', number: userDocument.replace(/\D/g, '') } }
        : {}),
    },
    back_urls: {
      success: successUrl,
      failure: cancelUrl,
      pending: cancelUrl,
    },
    auto_return: 'approved',
    external_reference: `${userId}|${plan.id}`,
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhooks/mercadopago`,
    metadata: {
      user_id: userId,
      plan_id: params.plan.id,
      provider: 'mercadopago',
    },
    expires: false,
    expires_at: undefined,
  };

  if (isSubscription) {
    // Create preapproval plan for recurring, auto-renewing payments
    const planData = {
      reason: `RutawayNow - ${t(params.plan.nameKey)}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: params.plan.interval === 'month' ? 'months' : 'weeks',
        ...(params.plan.interval === 'month' ? { billing_day: 1 } : {}),
        billing_day_proportional: true,
        transaction_amount: amount,
        currency_id: 'BRL',
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
        payment_methods: undefined,
      },
      back_url: successUrl,
    };

    const preApprovalPlanResult = await preApprovalPlan.create({ body: planData });

    // Create preapproval (subscription) for the user.
    // Note: subscription notifications can only be configured during payment
    // creation (notification_url), not via "Your integrations".
    const preApprovalData = {
      preapproval_plan_id: preApprovalPlanResult.id,
      payer_email: userEmail,
      status: 'pending',
      external_reference: `${userId}|${plan.id}`,
      back_url: successUrl,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhooks/mercadopago`,
    };

    const preApprovalResult = await preApproval.create({ body: preApprovalData });
    const preApprovalRedirect = preApprovalResult as unknown as MercadoPagoRedirect;

    return {
      id: preApprovalResult.id,
      init_point: preApprovalRedirect.init_point,
      sandbox_init_point: preApprovalRedirect.sandbox_init_point,
    };
  }

  const preferenceResult = await preference.create({ body: preferenceData });
  const preferenceRedirect = preferenceResult as unknown as MercadoPagoRedirect;

  return {
    id: preferenceResult.id,
    init_point: preferenceRedirect.init_point,
    sandbox_init_point: preferenceRedirect.sandbox_init_point,
  };
}

export async function getMercadoPagoPayment(paymentId: string) {
  return payment.get({ id: paymentId });
}

export async function cancelMercadoPagoSubscription(preapprovalId: string) {
  return preApproval.update({
    id: preapprovalId,
    body: { status: 'cancelled' },
  });
}

export async function getMercadoPagoSubscription(preapprovalId: string) {
  return preApproval.get({ id: preapprovalId });
}