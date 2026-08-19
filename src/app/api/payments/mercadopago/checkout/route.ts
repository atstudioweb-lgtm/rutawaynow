import { NextRequest, NextResponse } from 'next/server';
import { createMercadoPagoPreference } from '@/lib/payments/mercadopago/checkout';
import { Plan, getAllPlans } from '@/config/pricing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, successUrl, cancelUrl } = body;

    const plans = getAllPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const user = {
      id: 'user_123',
      email: 'user@example.com',
      name: 'Usuário Teste',
      phone: '+55 11 99999-9999',
      document: '123.456.789-00',
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
  } catch (error) {
    console.error('Mercado Pago checkout error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar preferência de pagamento' },
      { status: 500 }
    );
  }
}