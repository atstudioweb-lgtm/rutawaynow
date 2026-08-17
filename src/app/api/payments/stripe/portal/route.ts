import { NextRequest, NextResponse } from 'next/server';
import { createStripePortalSession } from '@/lib/payments/stripe/checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID obrigatório' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const result = await createStripePortalSession(
      customerId,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/account`
    );

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão do portal' },
      { status: 500 }
    );
  }
}