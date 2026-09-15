import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoPayment } from '@/lib/payments/mercadopago/checkout';

export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const paymentId = params.paymentId;
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    const payment = await getMercadoPagoPayment(paymentId);
    const meta = payment.metadata as { plan_id?: string } | null;

    return NextResponse.json({
      status: payment.status,
      planType: meta?.plan_id ?? null,
    });
  } catch (error) {
    console.error('Failed to retrieve Mercado Pago payment:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment' },
      { status: 500 }
    );
  }
}