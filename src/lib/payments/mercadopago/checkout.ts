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
      phone: userPhone ? { area_code: userPhone.slice(0, 2), number: userPhone.slice(2) } : undefined,
      identification: userDocument ? { type: 'CPF', number: userDocument.replace(/\D/g, '') } : undefined,
    },
    back_urls: {
      success: successUrl,
      failure: cancelUrl,
      pending: cancelUrl,
    },
    auto_return: 'approved',
    external_reference: params.userId,
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhooks/mercadopago`,
    metadata: {
      user_id: userId,
      plan_id: params.plan.id,
      provider: 'mercadopago',
    },
    expires: false,
    expires_at: undefined,
    ...(isSubscription && {
      // For subscriptions, we create a preapproval plan instead
    }),
  };

  if (isSubscription) {
    // Create preapproval plan for recurring payments
    const { t } = getTranslation('pt');
    const planData = {
      reason: `RutawayNow - ${t(params.plan.nameKey)}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: params.plan.interval === 'month' ? 'months' : 'weeks',
        repetitions: 12, // 12 months/weeks
        billing_day: 1,
        billing_day_proportional: true,
        free_trial: { frequency: 1, frequency_type: 'months' },
        transaction_amount: amount,
        currency_id: 'BRL',
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'pix' }],
        payment_methods: undefined,
      },
      back_url: successUrl,
    };

    const preApprovalPlanResult = await preApprovalPlan.create({ body: planData });

    // Create preapproval (subscription) for the user
    const preApprovalData = {
      preapproval_plan_id: preApprovalPlanResult.id,
      payer_email: userEmail,
      card_token_id: undefined, // Will be filled when user adds card
      status: 'pending',
      external_reference: userId,
      back_url: successUrl,
    };

    const preApprovalResult = await preApproval.create({ body: preApprovalData });

    return {
      id: preApprovalResult.id,
      init_point: preApprovalResult.init_point,
      sandbox_init_point: (preApprovalResult as any).sandbox_init_point,
    };
  }

  const preferenceResult = await preference.create({ body: preferenceData });

  return {
    id: preferenceResult.id,
    init_point: preferenceResult.init_point,
    sandbox_init_point: (preferenceResult as any).sandbox_init_point,
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