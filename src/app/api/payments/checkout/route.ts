import { NextRequest, NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/payments/stripe/checkout';
import { createMercadoPagoPreference } from '@/lib/payments/mercadopago/checkout';
import { Plan, getAllPlans } from '@/config/pricing';
import { getTranslation } from '@/lib/i18n-server';
import { getBaseUrl } from '@/lib/base-url';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, currency, provider, successUrl, cancelUrl, lang } = body;

    // Validate plan
    const plans = getAllPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Get user from session (real Google user if logged in)
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    console.log('Checkout session:', session?.user?.email, session?.user?.id);
    const user = {
      id: (session?.user as { id?: string } | null)?.id || 'user_123',
      email: session?.user?.email || 'user@example.com',
      name: session?.user?.name || 'Usuário Teste',
    };
    console.log('Checkout user:', user.email, user.id);

    const baseUrl = getBaseUrl();

    // Create translation function for the requested language
    const { t } = getTranslation(lang as 'pt' | 'en');

    // Translate plan name and description for Stripe checkout
    const planName = t(plan.nameKey);
    const planDescription = t(plan.descriptionKey);
    const itineraryText = t(plan.itineraries > 1 ? 'pricing.itineraries' : 'pricing.itinerary');
    const intervalText = plan.interval ? ` / ${t(plan.interval === 'month' ? 'pricing.month' : 'pricing.fortnight')}` : '';

    if (provider === 'stripe') {
      const successUrl = `${baseUrl}/checkout/success?plan_id=${plan.id}&provider=${provider}&session_id={CHECKOUT_SESSION_ID}`;
      console.log('SUCCESS URL SENT TO STRIPE:', successUrl, 'baseUrl:', baseUrl);
      const result = await createStripeCheckoutSession({
        plan,
        currency: currency as 'BRL' | 'USD' | 'EUR',
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        successUrl,
        cancelUrl: cancelUrl || `${baseUrl}/pricing`,
        provider: 'stripe',
        lang,
        // Pass translated strings for Stripe
        planName: t(plan.nameKey),
        planDescription: t(plan.descriptionKey),
        itineraryText: t(plan.itineraries > 1 ? 'pricing.itineraries' : 'pricing.itinerary'),
        intervalText: plan.interval ? ` / ${t(plan.interval === 'month' ? 'pricing.month' : 'pricing.fortnight')}` : '',
      });

      return NextResponse.json({ url: result.url, sessionId: result.sessionId });
    } else if (provider === 'mercadopago') {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Faça login para pagar com Mercado Pago — sem login o plano não pode ser creditado.' },
          { status: 401 }
        );
      }
      const result = await createMercadoPagoPreference({
        plan,
        currency: 'BRL',
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        successUrl: `${baseUrl}/checkout/success?plan_id=${plan.id}&provider=mercadopago`,
        cancelUrl: cancelUrl || `${baseUrl}/pricing`,
        provider: 'mercadopago',
      });

      return NextResponse.json({ url: result.init_point, preferenceId: result.id });
    } else {
      return NextResponse.json({ error: 'Provedor de pagamento inválido' }, { status: 400 });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de pagamento' },
      { status: 500 }
    );
  }
}