import { NextRequest, NextResponse } from 'next/server';
import { createMercadoPagoPreference } from '@/lib/payments/mercadopago/checkout';
import { getAllPlans } from '@/config/pricing';
import { getBaseUrl } from '@/lib/base-url';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, cancelUrl, provider } = body;

    const plans = getAllPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Get user from session (real logged-in user)
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    const user = session?.user?.id
      ? { id: (session.user as { id: string }).id, email: session.user.email || 'user@example.com', name: session.user.name || 'Usuário' }
      : { id: 'user_123', email: 'user@example.com', name: 'Usuário Teste' };
    console.log('Mercado Pago checkout user:', user.email, user.id);

    const baseUrl = getBaseUrl();

    const result = await createMercadoPagoPreference({
      plan,
      currency: 'BRL',
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      successUrl: `${baseUrl}/checkout/success?plan_id=${plan.id}&provider=${provider}`,
      cancelUrl: cancelUrl || `${baseUrl}/pricing`,
      provider: 'mercadopago',
    });

    return NextResponse.json({ url: result.init_point, preferenceId: result.id });
  } catch (error) {
    console.error('Mercado Pago checkout error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar preferência de pagamento' },
      { status: 500 }
    );
  }
}