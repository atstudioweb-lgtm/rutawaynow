import { NextRequest, NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/payments/stripe/checkout';
import { Plan, getAllPlans } from '@/config/pricing';
import { getTranslation } from '@/lib/i18n-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, currency, successUrl, cancelUrl } = body;

    const plans = getAllPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Get user from session
    const user = {
      id: 'user_123',
      email: 'user@example.com',
      name: 'Usuário Teste',
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { t } = getTranslation('pt');

      const result = await createStripeCheckoutSession({
        plan,
        currency: currency as 'BRL' | 'USD' | 'EUR',
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${baseUrl}/pricing`,
        provider: 'stripe',
        lang: 'pt',
        // Pass translated strings
        planName: t(plan.nameKey),
        planDescription: t(plan.descriptionKey),
        itineraryText: t(`pricing.itinerary${plan.itineraries > 1 ? 's' : ''}`),
        intervalText: plan.interval ? ` / ${t(plan.interval === 'month' ? 'pricing.month' : 'pricing.fortnight')}` : '',
      });

    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de pagamento' },
      { status: 500 }
    );
  }
}