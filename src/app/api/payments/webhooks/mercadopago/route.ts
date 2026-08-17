import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const headersList = await headers();
  const signature = headersList.get('x-signature')!;
  const requestId = headersList.get('x-request-id')!;

  // Verify signature
  // Mercado Pago sends: x-signature: ts=1234567890,v1=signature
  // We need to verify using the webhook secret

  try {
    const { topic, id } = body;

    console.log('Mercado Pago webhook:', { topic, id });

    switch (topic) {
      case 'payment':
        await handlePaymentNotification(id);
        break;
      case 'subscription_preapproval':
        await handleSubscriptionNotification(id);
        break;
      case 'subscription_preapproval_plan':
        await handlePreapprovalPlanNotification(id);
        break;
      case 'subscription_authorized_payment':
        await handleAuthorizedPaymentNotification(id);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Mercado Pago webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentNotification(paymentId: string) {
  console.log('Mercado Pago payment notification:', paymentId);
  // TODO: Fetch payment details and update order in database
  // const payment = await getMercadoPagoPayment(paymentId);
  // await db.updatePaymentStatus(payment.id, payment.status);
}

async function handleSubscriptionNotification(preapprovalId: string) {
  console.log('Mercado Pago subscription notification:', preapprovalId);
  // TODO: Fetch subscription details and update user subscription
  // const subscription = await getMercadoPagoSubscription(preapprovalId);
  // await db.updateUserSubscription(userId, { ... });
}

async function handlePreapprovalPlanNotification(planId: string) {
  console.log('Mercado Pago preapproval plan notification:', planId);
}

async function handleAuthorizedPaymentNotification(paymentId: string) {
  console.log('Mercado Pago authorized payment:', paymentId);
  // TODO: Handle successful recurring payment
}