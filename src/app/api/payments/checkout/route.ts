import { NextRequest, NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/payments/stripe/checkout';
import { createMercadoPagoPreference } from '@/lib/payments/mercadopago/checkout';
import { Plan, getAllPlans } from '@/config/pricing';

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

    // Get user from session (you'll need to implement auth)
    // For now, using mock user data
    const user = {
      id: 'user_123',
      email: 'user@example.com',
      name: 'Usuário Teste',
      phone: '+55 11 99999-9999',
      document: '123.456.789-00',
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (provider === 'stripe') {
      const result = await createStripeCheckoutSession({
        plan,
        currency: currency as 'BRL' | 'USD' | 'EUR',
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${baseUrl}/pricing`,
        provider: 'stripe',
        t: (key) => key, // Fallback for API routes without i18n context
        lang, // Pass language for Stripe locale
      });

      return NextResponse.json({ url: result.url, sessionId: result.sessionId });
    } else if (provider === 'mercadopago') {
      const result = await createMercadoPagoPreference({
        plan,
        currency: 'BRL',
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        userPhone: user.phone,
        userDocument: user.document,
        successUrl: `${baseUrl}/checkout/success`,
        cancelUrl: cancelUrl || `${baseUrl}/pricing`,
        provider: 'mercadopago',
        t: (key) => key, // Fallback for API routes without i18n context
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